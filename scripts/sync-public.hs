#!/usr/bin/env cabal
{- cabal:
build-depends: base, shh, time, text, bytestring
default-language: GHC2021
ghc-options: -threaded -Wall -Wunused-packages
-}
{-# LANGUAGE ExtendedDefaultRules #-}
{-# LANGUAGE LambdaCase           #-}
{-# LANGUAGE OverloadedStrings    #-}
{-# LANGUAGE QuasiQuotes          #-}
{-# LANGUAGE TemplateHaskell      #-}

import           Control.Exception
import           Control.Monad         (unless)

import qualified Data.ByteString       as BS
import qualified Data.ByteString.Lazy  as BL
import qualified Data.Text             as T
import qualified Data.Text.Encoding    as T
import qualified Data.Text.IO          as T
import           Data.Time.Clock.POSIX (getPOSIXTime)
import           Shh
import           System.Exit
import           System.IO             (BufferMode (..), hSetBuffering, stderr,
                                        stdout)
import           Text.Printf           (printf)

-- Load required git commands
load SearchPath ["git"]

setOutputToNobuffering :: IO ()
setOutputToNobuffering = do
    hSetBuffering stdout NoBuffering
    hSetBuffering stderr NoBuffering

-- Check if we're in a git repository
checkInGitRepo :: IO Bool
checkInGitRepo = do
    code <- exitCode (git "rev-parse" "--git-dir")
    return $ code == 0

-- | Check if `public` remote exists
checkHasPublicRemote :: IO Bool
checkHasPublicRemote = do
    remotes <- decodeUtf8AndClean <$> (git "remote" |> captureTrim')
    return $ "public" `T.isInfixOf` remotes

-- | Check if `public` branch exists
checkHasPublicBranch :: IO Bool
checkHasPublicBranch = do
    code <- exitCode (git "show-ref" "--verify" "--quiet" "refs/heads/public")
    return $ code == 0

-- | Get current branch name
getCurrentBranch :: IO T.Text
getCurrentBranch = do
    branch <- git "symbolic-ref" "--short" "HEAD" |> captureTrim'
    return $ T.strip $ T.pack $ show branch

-- | Create temporary branch name
getTempBranchName :: IO T.Text
getTempBranchName = do
    timestamp <- round <$> getPOSIXTime
    return $ T.pack $ printf "temp-public-%d" (timestamp :: Integer)

-- | Get current SHA
getCurrentSha :: IO (Maybe T.Text)
getCurrentSha = do
    sha <- decodeUtf8AndClean <$> (git "rev-parse" "--short" "HEAD" |> captureTrim')
    return $ if T.null sha
        then Nothing
        else Just sha

-- Main synchronization function
syncToPublic :: IO ()
syncToPublic = do
    -- Run checks
    inGitRepo <- checkInGitRepo
    unless inGitRepo $ error "Not in a git repository"

    hasPublicRemote <- checkHasPublicRemote
    unless hasPublicRemote $ error "'public' remote not configured"

    hasPublicBranch <- checkHasPublicBranch
    unless hasPublicBranch $ error "'public' branch does not exist"

    T.putStrLn "Starting synchronization..."

    -- Checkout public branch
    T.putStrLn "Checking out `public` branch..."
    git "checkout" "public"

    -- Get current commit SHA
    sha <- getCurrentSha >>= \case
        Nothing -> error "Failed to get SHA: empty result"
        Just s  -> return s
    T.putStrLn $ "Current SHA: " <> sha

    -- Create and checkout new orphan branch
    tempBranch <- getTempBranchName
    T.putStrLn $ "Creating temporary branch: " <> tempBranch
    git "checkout" "--orphan" (T.unpack tempBranch)

    -- Add files
    T.putStrLn "Adding files..."
    git "add" "."

    -- Create commit
    T.putStrLn "Creating commit..."
    git "commit" "-m" (T.unpack $ "Update with private " <> sha)

    -- Force push to public remote
    T.putStrLn "Pushing to public remote..."
    git "push" "-f" "public" (T.unpack $ tempBranch <> ":public")

    -- Clean up: switch back to original branch and delete temporary branch
    T.putStrLn "Cleaning up..."
    git "checkout" "public"
    git "branch" "-D" (T.unpack tempBranch)

    T.putStrLn "Successfully synchronized with public repository"
    T.putStrLn $ "Private commit: " <> sha

main :: IO ()
main = do
    setOutputToNobuffering
    syncToPublic


{---------------------------------------------
             Helpers
----------------------------------------------}

decodeUtf8AndClean :: BS.ByteString -> T.Text
decodeUtf8AndClean = T.strip . T.decodeUtf8

captureTrim' :: Proc BS.ByteString
captureTrim' = fmap BL.toStrict capture

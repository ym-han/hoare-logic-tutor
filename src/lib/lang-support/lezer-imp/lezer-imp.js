// This file was generated by lezer-generator. You probably shouldn't edit it.
import {LRParser} from "@lezer/lr"
const spec_Name = {__proto__:null,true:86, false:86, skip:100}
export const parser = LRParser.deserialize({
  version: 14,
  states: ")SOYQPOOOeQPO'#C_OyQPO'#C{O!OQPO'#C}OOQO'#Cz'#CzQOQPOOOOQO'#C`'#C`O!TQPO'#CfOOQO'#Ch'#ChO!cQQO'#CrOeQPO'#CmOOQO'#D['#D[O!wQQO'#D[O#cQPO'#DVOeQPO'#CuOOQO'#DW'#DWO#tQPO,58yO!TQPO,59gOOQO,59i,59iOOQO,59Q,59QO!TQPO'#CmO!TQPO,59TO!TQPO,59TO!TQPO,59^O#yQQO,59XO$QQPO,59eO$`QPO'#CeOOQO,58|,58|OeQPO,59YOeQPO,59[OeQPO,59cOeQPO'#DPO$tQPO,59qOOQO,59a,59aOOQO1G.e1G.eO$|QPO1G/RO%_QPO,59XOOQO1G.o1G.oO&RQQO1G.oO&]QPO1G.xOOQO1G.s1G.sOOQO1G/P1G/PO'`QPO'#DYO!TQPO'#DYO'gQPO,59POOQO1G.t1G.tO'lQPO1G.vO(QQPO1G.}O(fQPO,59kOOQO-E6}-E6}OOQO7+$m7+$mO(wQPO'#DOO)YQPO,59tO)bQPO,59tOOQO1G.k1G.kO)iQPO1G.oO*PQPO,59jO!TQPO,59jOOQO-E6|-E6|O*eQPO1G/`O*mQPO1G/UO!TQPO,59T",
  stateData: "+R~OvOSPOS~OTQOxPO!SRO~OT[OWYOZVOj^O{UO!PWO~OpaO~O!RbO~OTZOWdOZVO!PWO~OZfO^eO_eO`eOggOhgO~OWjOZ!OX^!OX_!OX`!OXg!OXh!OXV!OX~OclOemOlnO!QoOwyX~OwrO~OVxO~P!cOVyOclOemOlnO~OTZOWdOZVO}{O!PWOV|P~O!QoOwya~OZ!_O^eO_eO`eO!R!SO~OVxOZ!_O^eO_eO`eO~O^eO_eO`eOZ]iV]i~Og]ih]i~P%pOZ!_O^eO_eO`eOcfiefilfiwfi!QfiVfi~OZ!_O^eO_eO`eO!Q!TO~OV|X~P&}OV!WO~OclOedildiwdi!QdiVdi~OclOemOlnOwki!QkiVki~OclOemOlnOwsa!Qsa~OTZOWdOZVO}!ZO!PWO~O!Q!TOV|a~OV|a~P&}O!R]ic]ie]il]iw]i!Q]i~P%pOZ!_O^eO_eO`eOVra!Qra~O!Q!TOV|i~OZ!_O^eO_eO`eOVri!Qri~O",
  goto: "$s!PPPP!Q!TP!TPP!^!aP!a!aPPP!a!TP!TP!TPP!TP!TP!T!Q!uP!u!x#SPPPPP#Y#]P#rP#uRTO__PY^lmnoRk[uZPVY^adefgjlmno{!T!Z!_RSOQ!UzS![!U!]R!]!VQp]R!RpR`PQ]PQiYQq^Q}lQ!OmQ!PnR!QoR|j[XP^lmnoQcVQhYQsaQtdQueQvfQwgQzjQ!V{Q!X!_Q!Y!TR!^!Z",
  nodeNames: "⚠ LineComment TopDecl Assertion LitBool Name PredicateApp ) ( ArgList UnaryExpr ArithOp LitNumber BinArithE ArithOp ArithOp ArithOp ParenthesizedArithExp AndE AndOp OrE OrOp CompE CompareOp CompareOp NegE NotOp ImpliesE ImpliesOp ParenthesizedFormula Command Assign AssignOp CmdSkip",
  maxTerm: 50,
  nodeProps: [
    ["group", -8,4,6,18,20,22,25,27,29,"Formula"],
    ["openedBy", 7,"("],
    ["closedBy", 8,")"]
  ],
  skippedNodes: [0,1],
  repeatNodeCount: 2,
  tokenData: "'g~RnXY#PYZ#P]^#Ppq#Pqr#bst#ouv$Wvw$]xy$hyz$mz{$r{|$w|}$|}!O$w!O!P%R!P!Q%d!Q![%i![!]%q!]!^%|!^!_&R!_!`&`!`!a&R!c!}&m#R#S&m#T#o&m#o#p&{#p#q'Q#q#r']#r#s'b$r$s'b~#USv~XY#PYZ#P]^#Ppq#PR#gPjP!_!`#jQ#oOgQ~#tSP~OY#oZ;'S#o;'S;=`$Q<%lO#o~$TP;=`<%l#o~$]O_~~$`Pvw$c~$hOc~~$mOW~~$rOV~~$wO`~~$|OZ~~%RO!Q~~%UP!O!P%X~%[P!O!P%_~%dO}~~%iO^~~%nP!P~!Q![%i~%tP!_!`%w~%|Op~~&RO!R~~&WPh~!_!`&Z~&`Oh~R&ePgQ!`!a&hP&mOlP~&rRT~!c!}&m#R#S&m#T#o&m~'QOx~~'TP#p#q'W~']Oe~~'bOw~P'gOjP",
  tokenizers: [0, 1],
  topRules: {"TopDecl":[0,2]},
  dynamicPrecedences: {"18":-1},
  specialized: [{term: 5, get: (value) => spec_Name[value] || -1}],
  tokenPrec: 0
})

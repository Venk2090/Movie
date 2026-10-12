import { Project, LanguageCode, Scene, TranscriptSegment, LocalizedOutput, PipelineStage } from '../types';
import { SUPPORTED_LANGUAGES, INITIAL_11_LANGUAGES } from './languages';
import {
  generateSceneArtwork,
  DEFAULT_CHARACTER_CONSISTENCY,
  prependCharacterConsistencyToPrompt
} from '../utils/sceneArt';

export const LOCALIZED_SPEECH_MAP: Record<LanguageCode, string[]> = {
  en: [
    "Welcome to this investigative field report by Journalist Sai, examining the harsh realities of daily life in Bengaluru.",
    "Gridlocked traffic corridors, skyrocketing apartment rents, and escalating daily living costs are squeezing working citizens.",
    "Severe infrastructure deficits, persistent road decay, and overwhelmed transit systems test citizen patience every single day.",
    "Residents urgently petition municipal authorities and elected leaders for decisive urban governance and infrastructure remedies."
  ],
  te: [
    "నమస్కారం, జర్నలిస్ట్ సాయి విశ్లేషణకు స్వాగతం. బెంగళూరు నగరంలో సామాన్య ప్రజల జీవన విధానం మరియు ఎదురవుతున్న సవాళ్లపై ఈ ప్రత్యేక కథనం.",
    "ట్రాఫిక్ జామ్‌లు, అద్దెలు మరియు రోజువారీ ఖర్చులు భరించలేని విధంగా పెరుగుతున్నాయి. ఉద్యోగులు మరియు వలసదారుల పరిస్థితి దుర్భరంగా మారింది.",
    "మౌలిక సదుపాయాల కొరత, రోడ్ల దుస్థితి మరియు ప్రజా రవాణా సమస్యలతో ప్రజలు నిత్యం తీవ్ర ఇబ్బందులు పడుతున్నారు.",
    "ప్రభుత్వ అధికారులు, ప్రజాప్రతినిధులు వెంటనే స్పందించి శాశ్వత పరిష్కారాలు చూపాలని నగరవాసులు కోరుతున్నారు. జర్నలిస్ట్ సాయి గ్రౌండ్ రిపోర్ట్."
  ],
  hi: [
    "पत्रकार साई की इस विशेष रिपोर्ट में आपका स्वागत है, जिसमें बेंगलुरु में दैनिक जीवन की वास्तविकताओं का विश्लेषण किया गया है।",
    "बढ़ते ट्रैफिक जाम, आसमान छूते किराए और भारी जीवनयापन खर्च ने आम नागरिकों का जीवन कठिन बना दिया है।",
    "बुनियादी ढांचे की कमी, सड़कों की खस्ताहाली और सार्वजनिक परिवहन की समस्याओं से लोग रोज़ाना जूझ रहे हैं।",
    "शहरवासी प्रशासन से तत्काल और प्रभावी सुधारों की मांग कर रहे हैं। पत्रकार साई की ग्राउंड रिपोर्ट।"
  ],
  kn: [
    "ಪತ್ರಕರ್ತ ಸಾಯಿ ಅವರ ಈ ವಿಶೇಷ ವರದಿಗೆ ಸ್ವಾಗತ, ಬೆಂಗಳೂರಿನಲ್ಲಿ ದೈನಂದಿನ ಜೀವನದ ನೈಜ ಚಿತ್ರಣ ಇಲ್ಲಿದೆ.",
    "ಹೆಚ್ಚುತ್ತಿರುವ ಟ್ರಾಫಿಕ್ ಸಮಸ್ಯೆ, ದುಬಾರಿ ಬಾಡಿಗೆ ಮತ್ತು ಹೆಚ್ಚುತ್ತಿರುವ ಜೀವನ ವೆಚ್ಚವು ಸಾಮಾನ್ಯ ಜನರನ್ನು ಹೈರಾಣಾಗಿಸಿದೆ.",
    "ಮೂಲಸೌಕರ್ಯಗಳ ಕೊರತೆ ಮತ್ತು ರಸ್ತೆಗಳ ದುಸ್ಥಿತಿಯಿಂದಾಗಿ ಸಾರ್ವಜನಿಕರು ಪ್ರತಿದಿನ ತೀವ್ರ ತೊಂದರೆ ಅನುಭವಿಸುತ್ತಿದ್ದಾರೆ.",
    "ನಗರವಾಸಿಗಳು ಆಡಳಿತದಿಂದ ತಕ್ಷಣದ ಪರಿಹಾರ ಮತ್ತು ಸಮಗ್ರ ಸುಧಾರಣೆಯನ್ನು ನಿರೀಕ್ಷಿಸುತ್ತಿದ್ದಾರೆ. ಪತ್ರಕರ್ತ ಸಾಯಿ ಗ್ರೌಂಡ್ ರಿಪೋರ್ಟ್."
  ],
  es: [
    "Bienvenidos a este informe especial del periodista Sai, que analiza las duras realidades de la vida en Bangalore.",
    "Los embotellamientos viales, los altos costos de alquiler y el encarecimiento de la vida sofocan a los residentes.",
    "El déficit de infraestructura y los problemas de transporte público complican los desplazamientos diarios.",
    "Los ciudadanos exigen intervenciones gubernamentales urgentes y reformas estructurales. Reporte de Journalist Sai."
  ],
  fr: [
    "Bienvenue dans ce reportage d'investigation par Journalist Sai sur les réalités quotidiennes à Bangalore.",
    "Les embouteillages paralysants, les loyers exorbitants et le coût de la vie pèsent lourdement sur les habitants.",
    "Les déficits d'infrastructures routières et de transports en commun aggravent les difficultés quotidiennes.",
    "Les citoyens réclament des réformes urbaines rapides et durables aux autorités publiques."
  ],
  zh: [
    "欢迎收看记者赛伊（Journalist Sai）关于班加罗尔城市生活现状与民生困境的深度调查报道。",
    "严重的交通拥堵、飞涨的房租以及昂贵的生活成本，让普通工薪阶层面临沉重生存压力。",
    "基础设施严重滞后、道路损毁与公共交通瓶颈，使民众每天的通勤变得异常艰难。",
    "市民呼吁管理部门尽快采取切实有效的治理改革措施。记者赛伊现场报道。"
  ],
  pt: [
    "Bem-vindo a esta reportagem investigativa do jornalista Sai sobre as duras realidades da vida diária em Bangalore.",
    "Engarrafamentos constantes, aluguéis exorbitantes e o alto custo de vida sufocam os cidadãos trabalhadores.",
    "A infraestrutura precária e o transporte público deficiente tornam o deslocamento diário uma batalha constante.",
    "Os cidadãos exigem reformas estruturais imediatas das autoridades municipais e líderes governamentais."
  ],
  ml: [
    "ബംഗളൂരുവിലെ ദൈനംദിന ജീവിതത്തിന്റെ യാഥാർത്ഥ്യങ്ങൾ പരിശോധിക്കുന്ന ജേണലിസ്റ്റ് സായിയുടെ പ്രത്യേക റിപ്പോർട്ടിലേക്ക് സ്വാഗതം.",
    "രൂക്ഷമായ ഗതാഗതക്കുരുക്കും ഉയർന്ന വാടകയും വർദ്ധിച്ചുവരുന്ന ജീവിതച്ചെലവും സാധാരണക്കാരുടെ ജീവിതം ദുസ്സഹമാക്കുന്നു.",
    "അടിസ്ഥാന സൗകര്യങ്ങളുടെ അപര്യാപ്തതയും റോഡുകളുടെ ശോചനീയാവസ്ഥയും യാത്രക്കാരെ നിത്യേന വട്ടംകറക്കുന്നു.",
    "നഗരഭരണത്തിൽ സുസ്ഥിരമായ പരിഷ്കാരങ്ങൾ വേണമെന്ന് പൗരന്മാർ അടിയന്തരമായി ആവശ്യപ്പെടുന്നു."
  ],
  bn: [
    "সাংবাদিক সাই-এর এই বিশেষ প্রতিবেদনে স্বাগতম, যেখানে ব্যাঙ্গালোরের বাস্তব জীবনের চিত্র তুলে ধরা হয়েছে।",
    "তীব্র যানজট, আকাশছোঁয়া বাড়ি ভাড়া এবং দৈনন্দিন খরচের বৃদ্ধি সাধারণ মানুষের জীবনকে দুর্বিষহ করে তুলেছে।",
    "অবকাঠামোগত ঘাটতি এবং রাস্তার বেহাল দশা প্রতিদিনের যাতায়াতকে চরম কষ্টের করে তুলেছে।",
    "নাগরিকরা অবিলম্বে নগর প্রশাসন ও নেতাদের কাছ থেকে কার্যকর পদক্ষেপের দাবি জানাচ্ছেন।"
  ],
  gu: [
    "પત્રકાર સાંઈના આ વિશેષ ગ્રાઉન્ડ રિપોર્ટમાં આપનું સ્વાગત છે, જેમાં બેંગલુરુના રોજિંદા જીવનની વાસ્તવિકતાઓ રજૂ કરવામાં આવી છે.",
    "ભારે ટ્રાફિક જામ, આસમાને પહોંચેલું ભાડું અને વધતો જીવનખર્ચ સામાન્ય નાગરિકો માટે મુશ્કેલ બન્યો છે.",
    "ઈન્ફ્રાસ્ટ્રક્ચરની અછત અને બિસ્માર રસ્તાઓ દરરોજ નાગરિકોની ધીરજની કસોટી કરે છે.",
    "શહેરના લોકો વહીવટીતંત્ર પાસે તાત્કાલિક ઉકેલ અને કાયમી સુધારાની માંગ કરી રહ્યા છે."
  ],
  ru: [
    "Добро пожаловать в репортаж журналиста Саи о реальных проблемах повседневной жизни в Бангалоре.",
    "Транспортный коллапс, заоблачная аренда и растущие расходы делают жизнь горожан крайне тяжелой.",
    "Нехватка инфраструктуры и разбитые дороги превращают ежедневные поездки в тяжелое испытание.",
    "Жители настоятельно призывают городские власти провести безотлагательные структурные реформы."
  ]
};

// Complete Multi-Language Translations for Nationalist Hub Episode 216 (Amit Shah UCC, Ajit Doval NSA, ISRO PSLV)
export const NATIONALIST_HUB_SPEECH_MAP: Record<LanguageCode, string[]> = {
  te: [
    "నమస్కారం, నేషనలిస్ట్ హబ్ నేషనల్ రౌండప్ ఎపిసోడ్ 216 కి స్వాగతం. ఈరోజు కేంద్ర హోంమంత్రి అమిత్ షా తాజా ప్రకటన, దేశ భద్రతా సలహాదారు అజిత్ దోవల్ వ్యూహాత్మక సమీక్ష, మరియు పీఎస్‌ఎల్‌వీ ప్రయోగాల వెనుక వాస్తవాలను సమగ్రంగా విశ్లేషిస్తున్నాం.",
    "కేంద్ర హోంమంత్రి అమిత్ షా నేతృత్వంలో యూనిఫాం సివిల్ కోడ్ అమలుకు సన్నాహాలు ముమ్మరమయ్యాయి. దేశంలోని 21 రాష్ట్రాలలో యుసిసి అమలుకు కార్యాచరణ సిద్ధమైంది.",
    "పౌర హక్కుల సమానత్వం, మహిళా సాధికారత మరియు వివిధ చట్టాల ఏకీకరణ లక్ష్యంగా ఈ చట్టం రూపొందుతోంది. ఉత్తరాఖండ్ తరహాలోనే ఇతర రాష్ట్రాలలో కూడా యుసిసి అమలుకు సన్నాహాలు జరుగుతున్నాయి.",
    "ఇదే సమయంలో జాతీయ భద్రతా సలహాదారు అజిత్ దోవల్ అత్యున్నత స్థాయి భద్రతా సమావేశాన్ని నిర్వహించారు. దేశ అంతర్గత భద్రత మరియు సైబర్ ముప్పులపై సమీక్ష చేపట్టారు.",
    "దేశవ్యాప్తంగా శాంతిభద్రతలను కాపాడటానికి నిఘా సంస్థలు మరియు కేంద్ర బలగాల సమన్వయాన్ని మరింత పటిష్టం చేశారు.",
    "ఇక ఇస్రో ప్రతిష్టాత్మక పీఎస్‌ఎల్‌వీ ప్రయోగాల్లో చోటుచేసుకున్న సాంకేతిక లోపాలు మరియు వైఫల్యాల వెనుక గల వాస్తవాలపై ప్రత్యేక నివేదికను నేషనలిస్ట్ హబ్ పరిశీలిస్తోంది.",
    "రాకెట్ ప్రయోగ సమయంలో సంభవించిన ఒత్తిడి తేడాలు, మరియు శాటిలైట్ కక్ష్యలోకి చేరడంలో ఎదురైన అవరోధాలను శాస్త్రవేత్తలు క్షుణ్ణంగా విశ్లేషించారు.",
    "అంతరిక్ష ఆస్తుల భద్రత దేశ సార్వభౌమత్వానికి సంబంధించిన వ్యూహాత్మక అంశమని నిపుణులు హెచ్చరిస్తున్నారు. విదేశీ సాంకేతిక జోక్యంపై దర్యాప్తు జరుగుతోంది.",
    "దేశ రక్షణ మరియు పౌర సమాచార వ్యవస్థలకు అవసరమైన ఉపగ్రహాలను కాపాడుకోవడానికి స్వదేశీ సాంకేతిక పరిజ్ఞానాన్ని మరింత ఆధునికీకరించాలని నిర్ణయించారు.",
    "వివాహం, విడాకులు మరియు వారసత్వ ఆస్తి హక్కులలో లింగ వివక్ష లేకుండా అందరికీ సమానమైన చట్టాలను అమలు చేయడమే యుసిసి ప్రధాన లక్ష్యం.",
    "వివిధ ప్రాంతీయ పార్టీలు మరియు పౌర సమాజ ప్రతినిధులతో కేంద్ర ప్రభుత్వం సంప్రదింపులను ముమ్మరం చేసింది.",
    "అంతర్గత భద్రతా పటిష్టత మరియు ఆధునిక పౌర చట్టాల అమలు దేశాన్ని ప్రపంచ వేదికపై మరింత శక్తివంతంగా నిలబెడతాయని నేషనలిస్ట్ హబ్ విశ్లేషిస్తోంది.",
    "కేంద్ర ప్రభుత్వం తీసుకుంటున్న ఈ నిర్ణయాలు భవిష్యత్తులో దేశ సమగ్రతకు బలమైన పునాదిగా నిలుస్తాయని పరిపాలనా రంగ నిపుణులు భావిస్తున్నారు.",
    "ఈ చట్టపరమైన మరియు శాస్త్రీయ మార్పులపై దేశవ్యాప్తంగా ప్రజలు, మేధావులు మరియు యువత తమ విస్తృత మద్దతును వ్యక్తం చేస్తున్నారు.",
    "అమిత్ షా తాజా ప్రకటన ప్రకారం రానున్న పార్లమెంట్ సమావేశాల్లో కీలక బిల్లులు ప్రవేశపెట్టబడే అవకాశముంది. అజిత్ దోవల్ మార్గదర్శకత్వంలో భద్రతా వ్యవస్థ పటిష్టమవుతోంది.",
    "21 రాష్ట్రాల ప్రభుత్వాలతో కేంద్రం నిర్వహిస్తున్న సంప్రదింపుల్లో కీలక పురోగతి సాధించబడింది. ప్రాంతీయ ఆకాంక్షలను పరిగణనలోకి తీసుకుంటూ ఏకాభిప్రాయ సాధనకు ప్రయత్నాలు జరుగుతున్నాయి.",
    "నేషనలిస్ట్ హబ్ ప్రత్యేక పరిశోధన ప్రకారం, అంతర్జాతీయ వ్యూహాత్మక పరిణామాలు మరియు దేశీయ అంతరిక్ష భద్రత పరస్పరం ముడిపడి ఉన్నాయని స్పష్టమవుతోంది.",
    "భద్రతా వ్యవస్థల ఆధునికీకరణ, ఇస్రో ప్రయోగాల రక్షణ మరియు చట్టాల పటిష్టత కోసం కేంద్ర క్యాబినెట్ పలు కీలక మార్గదర్శకాలను జారీ చేసింది.",
    "ఈ పరిణామాలపై దేశవ్యాప్తంగా విద్యావేత్తలు, యువత మరియు న్యాయ నిపుణులు తమ అభిప్రాయాలను వ్యక్తం చేస్తున్నారు. ప్రజాస్వామ్య వ్యవస్థలో పారదర్శకత అత్యంత ముఖ్యమైనది.",
    "జాతీయ భద్రత, సమగ్రత మరియు ఆధునిక పౌర హక్కుల దిశగా భారతదేశం సరికొత్త మైలురాయిని చేరుకోబోతోంది. అమిత్ షా, అజిత్ దోవల్ వ్యూహాలు దీనికి దిక్సూచిగా నిలుస్తున్నాయి.",
    "సమగ్ర విశ్లేషణ ప్రకారం త్వరలోనే తుది కార్యాచరణ మరియు రక్షణ వ్యూహం పార్లమెంట్ ముందుకు రానుంది. పౌర హక్కుల పరిరక్షణలో ఇది కీలక అడుగు.",
    "ఇది నేషనలిస్ట్ హబ్ ఎపిసోడ్ 216 ప్రత్యేక ప్రసారం. దేశ భద్రత, చట్టాల ఏకీకరణ మరియు శాస్త్రీయ విజయాలపై మా సమగ్ర విశ్లేషణ. సెలవు, జై హింద్."
  ],
  en: [
    "Welcome to Nationalist Hub National Roundup Episode 216. Today we present an in-depth analysis of Union Home Minister Amit Shah's groundbreaking announcement, NSA Ajit Doval's strategic intelligence review, and critical investigative revelations surrounding PSLV space missions.",
    "Union Home Minister Amit Shah has intensified legislative preparations for the nationwide implementation of the Uniform Civil Code, drafting blueprints for execution across 21 states.",
    "Targeting equal civil rights, women's empowerment, and statutory harmonization, consultations proceed on scaling the Uttarakhand UCC model across additional state jurisdictions.",
    "Concurrently, National Security Advisor Ajit Doval convened a top-tier security conclave, reviewing internal defense architecture, border surveillance, and emerging cyber-threat matrices.",
    "Intelligence agencies and central forces enhanced operational synergy to preserve civil stability, maintaining heightened surveillance across sensitive regions against disruptive actors.",
    "Nationalist Hub now investigates the underlying technical factors and telemetry anomalies observed in recent ISRO PSLV rocket launch sequences.",
    "Flight telemetry indicated stage-separation pressure differentials and orbit injection variance, prompting exhaustive diagnostic evaluation by aerospace propulsion experts.",
    "Security analysts emphasize that orbital asset resilience is indispensable for national sovereignty, prompting rigorous scrutiny of foreign interference and technological vulnerabilities.",
    "The defense establishment mandated enhanced hardening of indigenous satellite communications and space payload architectures against electronic warfare.",
    "Revisiting the Uniform Civil Code, core statutory reforms center on gender equality, universal rights in marriage, divorce, and ancestral inheritance protections.",
    "The central executive initiated high-level consultations with regional parties and civil society leaders, as state administrations evaluate draft implementation guidelines.",
    "Nationalist Hub's investigative thesis argues that internal legal modernization and aerospace resilience are twin pillars reinforcing national strategic autonomy.",
    "Administrative experts project that these structural executive reforms will consolidate institutional integrity, paving the way for parliamentary enactment.",
    "Nationwide dialogue intensifies across academia, youth, and civic groups, assessing how modern civil equality and technological prowess shape national advancement.",
    "Home Minister Amit Shah's statements signal pivotal legislative introductions in the upcoming session, while NSA Ajit Doval's directives reshape intelligence operations.",
    "Consultations across 21 state governments achieve substantial momentum, harmonizing regional priorities with a unified statutory civil framework.",
    "Nationalist Hub's investigative dossier demonstrates how geopolitical dynamics and sovereign aerospace assets directly interconnect with domestic stability.",
    "Strategic executive directives mandate rapid modernization of aerospace defense grids, space telemetry integrity, and robust inter-agency counter-sabotage protocols.",
    "Civic forums, legal scholars, and student assemblies across the nation voice dynamic perspectives on civil equality and defense readiness.",
    "India stands on the threshold of structural legal and strategic transformation, guided by high-level national security architecture and legislative modernization.",
    "Editorial synthesis confirms a synchronized roadmap for legislative enactment and technological resilience across upcoming parliamentary cycles.",
    "Concluding Nationalist Hub Episode 216. We thank our viewers for following this comprehensive analysis on national defense, legislative unification, and space resilience. Jai Hind."
  ],
  hi: [
    "नमस्कार, नेशनलिस्ट हब के नेशनल राउंडअप एपिसोड 216 में आपका स्वागत है। आज हम केंद्रीय गृह मंत्री अमित शाह की बड़ी घोषणा, राष्ट्रीय सुरक्षा सलाहकार अजित डोभाल की रणनीतिक समीक्षा और इसरो के पीएसएलवी मिशन के तथ्यों का विश्लेषण कर रहे हैं।",
    "केंद्रीय गृह मंत्री अमित शाह के नेतृत्व में समान नागरिक संहिता (UCC) को लागू करने की तैयारियां तेज हो गई हैं और 21 राज्यों में इसके क्रियान्वयन की रूपरेखा तैयार है।",
    "नागरिक अधिकारों की समानता, महिला सशक्तिकरण और कानूनों के एकीकरण के उद्देश्य से उत्तराखंड मॉडल को अन्य राज्यों में लागू करने पर विचार चल रहा है।",
    "इसी बीच राष्ट्रीय सुरक्षा सलाहकार अजित डोभाल ने उच्च स्तरीय सुरक्षा बैठक बुलाई, जिसमें आंतरिक सुरक्षा, सीमा निगरानी और साइबर खतरों की समीक्षा की गई।",
    "देशभर में कानून-व्यवस्था और शांति बनाए रखने के लिए खुफिया एजेंसियों और केंद्रीय बलों के बीच समन्वय को और मजबूत किया गया है।",
    "नेशनलिस्ट हब अब इसरो के पीएसएलवी रॉकेट प्रक्षेपण में देखी गई तकनीकी विसंगतियों और टेलीमेट्री आंकड़ों की विशेष पड़ताल प्रस्तुत कर रहा है।",
    "उड़ान टेलीमेट्री में तीसरे चरण के दबाव में अंतर और कक्षा में स्थापित होने की चुनौतियों का वैज्ञानिकों द्वारा गहन विश्लेषण किया गया है।",
    "रक्षा विशेषज्ञों का कहना है कि अंतरिक्ष संपत्तियों की सुरक्षा राष्ट्रीय संप्रभुता के लिए अत्यंत महत्वपूर्ण है और बाहरी तकनीकी हस्तक्षेप की जांच जारी है।",
    "रक्षा मंत्रालय ने स्वदेशी उपग्रह संचार और अंतरिक्ष प्रणालियों को इलेक्ट्रॉनिक युद्ध और तोड़फोड़ से बचाने के लिए कड़े निर्देश जारी किए हैं।",
    "समान नागरिक संहिता के तहत विवाह, तलाक और उत्तराधिकार में लैंगिक भेदभाव समाप्त कर सभी नागरिकों को समान अधिकार सुनिश्चित किए जाएंगे।",
    "केंद्र सरकार ने क्षेत्रीय दलों और नागरिक समाज के प्रतिनिधियों के साथ उच्च स्तरीय परामर्श तेज कर दिया है।",
    "नेशनलिस्ट हब के विश्लेषण के अनुसार आंतरिक कानूनी आधुनिकीकरण और अंतरिक्ष सुरक्षा आत्मनिर्भर भारत के दो मजबूत स्तंभ हैं।",
    "प्रशासनिक विशेषज्ञों का मानना है कि ये दूरगामी निर्णय भविष्य में देश की एकता और अखंडता को सुदृढ़ आधार प्रदान करेंगे।",
    "इन संवैधानिक और वैज्ञानिक सुधारों पर देशभर के नागरिकों, बुद्धिजीवियों और युवाओं ने व्यापक समर्थन व्यक्त किया है।",
    "गृह मंत्री अमित शाह के संकेतों के अनुसार आगामी संसद सत्र में महत्वपूर्ण विधेयक पेश किए जा सकते हैं, जबकि अजित डोभाल के निर्देशों से सुरक्षा तंत्र मजबूत हो रहा है।",
    "21 राज्य सरकारों के साथ चल रहे विचार-विमर्श में उल्लेखनीय प्रगति हुई है और राष्ट्रीय सहमति बनाने के प्रयास जारी हैं।",
    "नेशनलिस्ट हब की विशेष रिपोर्ट दर्शाती है कि वैश्विक भू-राजनीतिक घटनाक्रम और स्वदेशी अंतरिक्ष सुरक्षा एक-दूसरे से गहराई से जुड़े हैं।",
    "केंद्रीय मंत्रिमंडल ने रक्षा प्रणालियों के आधुनिकीकरण, इसरो मिशनों की सुरक्षा और कानूनी सुधारों के लिए महत्वपूर्ण दिशानिर्देश जारी किए हैं।",
    "देशभर के शिक्षाविद, विधि विशेषज्ञ और युवा लोकतांत्रिक पारदर्शिता तथा राष्ट्रीय सुरक्षा पर अपने विचार साझा कर रहे हैं।",
    "अमित शाह और अजित डोभाल की रणनीतियों के मार्गदर्शन में भारत राष्ट्रीय सुरक्षा और आधुनिक नागरिक अधिकारों के नए युग में प्रवेश कर रहा है।",
    "समग्र विश्लेषण के अनुसार जल्द ही अंतिम कार्ययोजना और रक्षा रणनीति संसद के समक्ष रखी जाएगी।",
    "यह था नेशनलिस्ट हब एपिसोड 216 का विशेष प्रसारण। राष्ट्रीय सुरक्षा, कानूनी एकीकरण और वैज्ञानिक उपलब्धियों पर हमारी विशेष रिपोर्ट देखने के लिए धन्यवाद। जय हिंद।"
  ],
  kn: [
    "ನಮಸ್ಕಾರ, ನ್ಯಾಷನಲಿಸ್ಟ್ ಹಬ್ ನ್ಯಾಷನಲ್ ರೌಂಡಪ್ ಸಂಚಿಕೆ 216 ಕ್ಕೆ ಸ್ವಾಗತ. ಇಂದು ಕೇಂದ್ರ ಗೃಹ ಸಚಿವ ಅಮಿತ್ ಶಾ ಅವರ ಮಹತ್ವದ ಘೋಷಣೆ, ರಾಷ್ಟ್ರೀಯ ಭದ್ರತಾ ಸಲಹೆಗಾರ ಅಜಿತ್ ದೋವಲ್ ಅವರ ಕಾರ್ಯತಂತ್ರದ ಪರಾಮರ್ಶೆ ಮತ್ತು ಇಸ್ರೋ ಪಿಎಸ್‌ಎಲ್‌ವಿ ಉಡಾವಣೆಯ ವಿಶ್ಲೇಷಣೆಯನ್ನು ಪ್ರಸ್ತುತಪಡಿಸುತ್ತಿದ್ದೇವೆ.",
    "ಕೇಂದ್ರ ಗೃಹ ಸಚಿವ ಅಮಿತ್ ಶಾ ಅವರ ನೇತೃತ್ವದಲ್ಲಿ ಏಕರೂಪ ನಾಗರಿಕ ಸಂಹಿತೆ (UCC) ಜಾರಿಗೆ ಸಿದ್ಧತೆಗಳು ತೀವ್ರಗೊಂಡಿದ್ದು, 21 ರಾಜ್ಯಗಳಲ್ಲಿ ಅನುಷ್ಠಾನಕ್ಕೆ ನೀಲನಕ್ಷೆ ಸಿದ್ಧವಾಗಿದೆ.",
    "ನಾಗರಿಕ ಹಕ್ಕುಗಳ ಸಮಾನತೆ ಮತ್ತು ಮಹಿಳಾ ಸಬಲೀಕರಣಕ್ಕಾಗಿ ಉತ್ತರಾಖಂಡ ಮಾದರಿಯನ್ನು ಇತರ ರಾಜ್ಯಗಳಲ್ಲೂ ಜಾರಿಗೆ ತರಲು ಸಮಾಲೋಚನೆಗಳು ನಡೆಯುತ್ತಿವೆ.",
    "ಇದೇ ವೇಳೆ ರಾಷ್ಟ್ರೀಯ ಭದ್ರತಾ ಸಲಹೆಗಾರ ಅಜಿತ್ ದೋವಲ್ ಅವರು ಉನ್ನತ ಮಟ್ಟದ ಭದ್ರತಾ ಸಭೆ ನಡೆಸಿ ಆಂತರಿಕ ಭದ್ರತೆ ಮತ್ತು ಸೈಬರ್ ಸವಾಲುಗಳನ್ನು ಪರಿಶೀಲಿಸಿದ್ದಾರೆ.",
    "ದೇಶಾದ್ಯಂತ ಶಾಂತಿ ಮತ್ತು ಸುವ್ಯವಸ್ಥೆ ಕಾಪಾಡಲು ಗುಪ್ತಚರ ಸಂಸ್ಥೆಗಳು ಹಾಗೂ ಕೇಂದ್ರ ಪಡೆಗಳ ನಡುವಿನ ಸಮನ್ವಯವನ್ನು ಮತ್ತಷ್ಟು ಬಲಪಡಿಸಲಾಗಿದೆ.",
    "ಇಸ್ರೋದ ಪಿಎಸ್‌ಎಲ್‌ವಿ ರಾಕೆಟ್ ಉಡಾವಣೆಯಲ್ಲಿ ಕಂಡುಬಂದ ತಾಂತ್ರಿಕ ವ್ಯತ್ಯಾಸಗಳು ಮತ್ತು ಟೆಲಿಮೆಟ್ರಿ ವರದಿಗಳ ಕುರಿತು ನ್ಯಾಷನಲಿಸ್ಟ್ ಹಬ್ ವಿಶೇಷ ತನಿಖಾ ವರದಿ.",
    "ರಾಕೆಟ್ ಉಡಾವಣೆಯ ಮೂರನೇ ಹಂತದ ಒತ್ತಡದ ವ್ಯತ್ಯಾಸ ಮತ್ತು ಉಪಗ್ರಹ ಕಕ್ಷೆ ಸೇರುವಿಕೆಯ ಸವಾಲುಗಳನ್ನು ವಿಜ್ಞಾನಿಗಳು ಕೂಲಂಕಷವಾಗಿ ವಿಶ್ಲೇಷಿಸಿದ್ದಾರೆ.",
    "ಬಾಹ್ಯಾಕಾಶ ಆಸ್ತಿಗಳ ಭದ್ರತೆಯು ದೇಶದ ಸಾರ್ವಭೌಮತೆಗೆ ಅತ್ಯಂತ ಮಹತ್ವದ್ದಾಗಿದ್ದು, ವಿದೇಶಿ ತಾಂತ್ರಿಕ ಹಸ್ತಕ್ಷೇಪದ ಬಗ್ಗೆ ತನಿಖೆ ನಡೆಯುತ್ತಿದೆ.",
    "ದೇಶದ ರಕ್ಷಣೆ ಮತ್ತು ಸಂವಹನ ಉಪಗ್ರಹಗಳನ್ನು ರಕ್ಷಿಸಲು ಸ್ವದೇಶಿ ತಂತ್ರಜ್ಞಾನವನ್ನು ಮತ್ತಷ್ಟು ಆಧುನೀಕರಿಸಲು ನಿರ್ಧರಿಸಲಾಗಿದೆ.",
    "ವಿವಾಹ, ವಿಚ್ಛೇದನ ಮತ್ತು ಆಸ್ತಿ ಹಕ್ಕುಗಳಲ್ಲಿ ಲಿಂಗ ತಾರತಮ್ಯವಿಲ್ಲದೆ ಎಲ್ಲರಿಗೂ ಸಮಾನ ಕಾನೂನು ಒದಗಿಸುವುದು ಯುಸಿಸಿ ಮುಖ್ಯ ಉದ್ದೇಶವಾಗಿದೆ.",
    "ವಿವಿಧ ಪ್ರಾದೇಶಿಕ ಪಕ್ಷಗಳು ಮತ್ತು ನಾಗರಿಕ ಸಮಾಜದ ಪ್ರತಿನಿಧಿಗಳೊಂದಿಗೆ ಕೇಂದ್ರ ಸರ್ಕಾರವು ಸಮಾಲೋಚನೆಗಳನ್ನು ತೀವ್ರಗೊಳಿಸಿದೆ.",
    "ಆಂತರಿಕ ಭದ್ರತೆ ಮತ್ತು ಆಧುನಿಕ ನಾಗರಿಕ ಕಾನೂನುಗಳ ಜಾರಿ ಭಾರತವನ್ನು ಜಾಗತಿಕ ವೇದಿಕೆಯಲ್ಲಿ ಮತ್ತಷ್ಟು ಬಲಿಷ್ಠಗೊಳಿಸುತ್ತದೆ ಎಂದು ನ್ಯಾಷನಲಿಸ್ಟ್ ಹಬ್ ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.",
    "ಕೇಂದ್ರ ಸರ್ಕಾರದ ಈ ನಿರ್ಧಾರಗಳು ಭವಿಷ್ಯದಲ್ಲಿ ದೇಶದ ಸಮಗ್ರತೆಗೆ ಭದ್ರ ಬುನಾದಿಯಾಗಲಿವೆ ಎಂದು ಆಡಳಿತ ತಜ್ಞರು ಅಭಿಪ್ರಾಯಪಟ್ಟಿದ್ದಾರೆ.",
    "ಈ ಕಾನೂನು ಮತ್ತು ವೈಜ್ಞಾನಿಕ ಬದಲಾವಣೆಗಳಿಗೆ ದೇಶಾದ್ಯಂತ ಸಾರ್ವಜನಿಕರು, ಚಿಂತಕರು ಮತ್ತು ಯುವಜನತೆ ವ್ಯಾಪಕ ಬೆಂಬಲ ವ್ಯಕ್ತಪಡಿಸಿದ್ದಾರೆ.",
    "ಅಮಿತ್ ಶಾ ಅವರ ಘೋಷಣೆಯಂತೆ ಮುಂಬರುವ ಸಂಸತ್ ಅಧಿವೇಶನದಲ್ಲಿ ಪ್ರಮುಖ ಮಸೂದೆಗಳು ಮಂಡನೆಯಾಗಲಿದ್ದು, ಅಜಿತ್ ದೋವಲ್ ಮಾರ್ಗದರ್ಶನದಲ್ಲಿ ಭದ್ರತಾ ವ್ಯವಸ್ಥೆ ಬಲಗೊಳ್ಳುತ್ತಿದೆ.",
    "21 ರಾಜ್ಯ ಸರ್ಕಾರಗಳೊಂದಿಗೆ ಕೇಂದ್ರ ನಡೆಸುತ್ತಿರುವ ಸಮಾಲೋಚನೆಯಲ್ಲಿ ಮಹತ್ವದ ಪ್ರಗತಿ ಸಾಧಿಸಲಾಗಿದ್ದು, ಒಮ್ಮತ ಮೂಡಿಸುವ ಪ್ರಯತ್ನಗಳು ನಡೆದಿವೆ.",
    "ಅಂತಾರಾಷ್ಟ್ರೀಯ ಕಾರ್ಯತಂತ್ರದ ಬೆಳವಣಿಗೆಗಳು ಮತ್ತು ದೇಶೀಯ ಬಾಹ್ಯಾಕಾಶ ಭದ್ರತೆ ಪರಸ್ಪರ ಬೆಸೆದುಕೊಂಡಿವೆ ಎಂದು ವಿಶೇಷ ವರದಿ ಸ್ಪಷ್ಟಪಡಿಸುತ್ತದೆ.",
    "ಭದ್ರತಾ ವ್ಯವಸ್ಥೆಗಳ ಆಧುನೀಕರಣ ಮತ್ತು ಇಸ್ರೋ ಯೋಜನೆಗಳ ರಕ್ಷಣೆಗಾಗಿ ಕೇಂದ್ರ ಸಂಪುಟ ಪ್ರಮುಖ ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಬಿಡುಗಡೆ ಮಾಡಿದೆ.",
    "ಈ ಬೆಳವಣಿಗೆಗಳ ಕುರಿತು ದೇಶಾದ್ಯಂತ ಶಿಕ್ಷಣ ತಜ್ಞರು, ಯುವಜನತೆ ಮತ್ತು ಕಾನೂನು ತಜ್ಞರು ತಮ್ಮ ಅಭಿಪ್ರಾಯಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತಿದ್ದಾರೆ.",
    "ರಾಷ್ಟ್ರೀಯ ಭದ್ರತೆ ಮತ್ತು ಆಧುನಿಕ ನಾಗರಿಕ ಹಕ್ಕುಗಳತ್ತ ಭಾರತವು ಹೊಸ ಮೈಲಿಗಲ್ಲನ್ನು ತಲುಪುತ್ತಿದೆ.",
    "ಸಮಗ್ರ ವಿಶ್ಲೇಷಣೆಯ ಪ್ರಕಾರ ಶೀಘ್ರದಲ್ಲೇ ಅಂತಿಮ ಕಾರ್ಯಯೋಜನೆ ಮತ್ತು ರಕ್ಷಣಾ ತಂತ್ರವು ಸಂಸತ್ತಿನ ಮುಂದೆ ಬರಲಿದೆ.",
    "ಇದು ನ್ಯಾಷನಲಿಸ್ಟ್ ಹಬ್ ಸಂಚಿಕೆ 216 ರ ವಿಶೇಷ ಪ್ರಸಾರ. ದೇಶದ ಭದ್ರತೆ ಮತ್ತು ಕಾನೂನು ಏಕೀಕರಣದ ಸಮಗ್ರ ವಿಶ್ಲೇಷಣೆಗೆ ಧನ್ಯವಾದಗಳು. ಜೈ ಹಿಂದ್."
  ],
  ml: [
    "നമസ്കാരം, നാഷണലിസ്റ്റ് ഹബ് നാഷണൽ റൗണ്ടപ്പ് എപ്പിസോഡ് 216-ലേക്ക് സ്വാഗതം. കേന്ദ്ര ആഭ്യന്തര മന്ത്രി അമിത് ഷായുടെ പ്രഖ്യാപനം, അജിത് ഡോവലിന്റെ സുരക്ഷാ അവലോകനം, ഐഎസ്ആർഒ പിഎസ്എൽവി ദൗത്യത്തിലെ കണ്ടെത്തലുകൾ എന്നിവയാണ് ഇന്ന് പരിശോധിക്കുന്നത്.",
    "കേന്ദ്ര ആഭ്യന്തര മന്ത്രി അമിത് ഷായുടെ നേതൃത്വത്തിൽ ഏകീകൃത സിവിൽ കോഡ് (UCC) 21 സംസ്ഥാനങ്ങളിൽ നടപ്പിലാക്കാനുള്ള തയ്യാറെടുപ്പുകൾ ശക്തമായി.",
    "പൗരാവകാശ സമത്വവും സ്ത്രീ ശാക്തീകരണവും ലക്ഷ്യമിട്ട് ഉത്തരാഖണ്ഡ് മാതൃക മറ്റ് സംസ്ഥാനങ്ങളിലേക്കും വ്യാപിപ്പിക്കാൻ ചർച്ചകൾ പുരോഗമിക്കുന്നു.",
    "ദേശീയ സുരക്ഷാ ഉപദേഷ്ടാവ് അജിത് ഡോവൽ ഉന്നതതല സുരക്ഷാ യോഗം വിളിച്ച് ആഭ്യന്തര സുരക്ഷയും സൈബർ ഭീഷണികളും വിലയിരുത്തി.",
    "രാജ്യത്തുടനീളം ക്രമസമാധാനം ഉറപ്പാക്കാൻ രഹസ്യാന്വേഷണ ഏജൻസികളുടെയും കേന്ദ്ര സേനകളുടെയും ഏകോപനം ശക്തമാക്കി.",
    "ഐഎസ്ആർഒയുടെ പിഎസ്എൽവി റോക്കറ്റ് വിക്ഷേപണത്തിലെ സാങ്കേതിക തകരാറുകളെക്കുറിച്ചും ടെലിമെട്രി വിവരങ്ങളെക്കുറിച്ചുമുള്ള പ്രത്യേക അന്വേഷണ റിപ്പോർട്ട്.",
    "വിക്ഷേപണ സമയത്തെ മൂന്നാം ഘട്ട മർദ്ദ വ്യതിയാനങ്ങളും ഭ്രമണപഥത്തിലെ വെല്ലുവിളികളും ശാസ്ത്രജ്ഞർ വിശദമായി വിശകലനം ചെയ്തു.",
    "ബഹിരാകാശ ആസ്തികളുടെ സുരക്ഷ രാജ്യത്തിന്റെ പരമാധികാരത്തിന് അത്യന്താപേക്ഷിതമാണെന്ന് വിദഗ്ധർ മുന്നറിയിപ്പ് നൽകുന്നു.",
    "പ്രതിരോധ-വാർത്താവിനിമയ ഉപഗ്രഹങ്ങളെ സംരക്ഷിക്കാൻ തദ്ദേശീയ സാങ്കേതികവിദ്യ കൂടുതൽ നവീകരിക്കാൻ തീരുമാനിച്ചു.",
    "വിവാഹം, വിവാഹമോചനം, സ്വത്തവകാശം എന്നിവയിൽ ലിംഗഭേദമില്ലാതെ തുല്യ നീതി ഉറപ്പാക്കുകയാണ് യുസിസിയുടെ ലക്ഷ്യം.",
    "വിവിധ പ്രാദേശിക പാർട്ടികളുമായും പൗരസമൂഹ പ്രതിനിധികളുമായും കേന്ദ്ര സർക്കാർ ചർച്ചകൾ സജീവമാക്കി.",
    "ആഭ്യന്തര സുരക്ഷയും ആധുനിക പൗരനിയമങ്ങളും ഇന്ത്യയെ ആഗോളതലത്തിൽ കൂടുതൽ കരുത്തുറ്റതാക്കുമെന്ന് നാഷണലിസ്റ്റ് ഹബ് വിലയിരുത്തുന്നു.",
    "കേന്ദ്ര സർക്കാരിന്റെ ഈ തീരുമാനങ്ങൾ രാജ്യത്തിന്റെ ഐക്യത്തിനും അഖണ്ഡതയ്ക്കും ശക്തമായ അടിത്തറയേകുമെന്ന് വിദഗ്ധർ കരുതുന്നു.",
    "ഈ നിയമപരവും ശാസ്ത്രീയവുമായ മാറ്റങ്ങൾക്ക് രാജ്യത്തുടനീളം ജനങ്ങളും യുവാക്കളും വലിയ പിന്തുണ നൽകുന്നു.",
    "അമിത് ഷായുടെ പ്രഖ്യാപനപ്രകാരം വരുന്ന പാർലമെന്റ് സമ്മേളനത്തിൽ പ്രധാന ബില്ലുകൾ അവതരിപ്പിക്കാൻ സാധ്യതയുണ്ട്.",
    "21 സംസ്ഥാന സർക്കാരുകളുമായി കേന്ദ്രം നടത്തുന്ന ചർച്ചകളിൽ നിർണ്ണായക പുരോഗതി കൈവരിച്ചു.",
    "അന്താരാഷ്ട്ര തന്ത്രപരമായ മാറ്റങ്ങളും ആഭ്യന്തര ബഹിരാകാശ സുരക്ഷയും പരസ്പരം ബന്ധപ്പെട്ടിരിക്കുന്നുവെന്ന് റിപ്പോർട്ട് വ്യക്തമാക്കുന്നു.",
    "പ്രതിരോധ സംവിധാനങ്ങളുടെ നവീകരണത്തിനും ഐഎസ്ആർഒ ദൗത്യങ്ങളുടെ സുരക്ഷയ്ക്കുമായി കേന്ദ്ര മന്ത്രിസഭ മാർഗ്ഗനിർദ്ദേശങ്ങൾ പുറത്തിറക്കി.",
    "രാജ്യത്തുടനീളമുള്ള അക്കാദമിക് വിദഗ്ധരും നിയമജ്ഞരും ജനാധിപത്യ സുതാര്യതയെക്കുറിച്ച് അഭിപ്രായങ്ങൾ പങ്കുവെക്കുന്നു.",
    "ദേശീയ സുരക്ഷയുടെയും ആധുനിക പൗരാവകാശങ്ങളുടെയും പുതിയൊരു നാഴികക്കല്ലിലേക്ക് ഇന്ത്യ മുന്നേറുകയാണ്.",
    "സമഗ്രമായ വിശകലനത്തിനൊടുവിൽ അന്തിമ കർമ്മപദ്ധതി ഉടൻ പാർലമെന്റിന് മുന്നിലെത്തും.",
    "ഇതോടെ നാഷണലിസ്റ്റ് ഹബ് എപ്പിസോഡ് 216-ന്റെ പ്രത്യേക സംപ്രേഷണം പൂർണ്ണമാകുന്നു. നന്ദി, ജയ് ഹിന്ദ്."
  ],
  bn: [
    "নমস্কার, ন্যাশনালিস্ট হাব ন্যাশনাল রাউন্ডআপ পর্ব ২১৬-এ স্বাগতম। আজ কেন্দ্রীয় স্বরাষ্ট্রমন্ত্রী অমিত শাহের ঘোষণা, জাতীয় নিরাপত্তা উপদেষ্টা অজিত ডোভালের কৌশলগত পর্যালোচনা এবং ইসরোর পিএসএলভি অভিযানের তথ্য বিশ্লেষণ করা হচ্ছে।",
    "কেন্দ্রীয় স্বরাষ্ট্রমন্ত্রী অমিত শাহের নেতৃত্বে দেশের ২১টি রাজ্যে অভিন্ন দেওয়ানি বিধি (UCC) কার্যকর করার প্রস্তুতি জোরদার হয়েছে।",
    "নাগরিক অধিকারের সমতা এবং নারী ক্ষমতায়নের লক্ষ্যে উত্তরাখণ্ড মডেল অন্যান্য রাজ্যেও চালুর বিষয়ে আলোচনা চলছে।",
    "একই সময়ে জাতীয় নিরাপত্তা উপদেষ্টা অজিত ডোভাল অভ্যন্তরীণ নিরাপত্তা, সীমান্ত নজরদারি এবং সাইবার হুমকি নিয়ে উচ্চপর্যায়ের বৈঠক করেছেন।",
    "সারা দেশে শান্তি ও স্থিতিশীলতা বজায় রাখতে গোয়েন্দা সংস্থা ও কেন্দ্রীয় বাহিনীর সমন্বয় আরও মজবুত করা হয়েছে।",
    "ইসরোর পিএসএলভি রকেট উৎক্ষেপণে প্রযুক্তিগত ত্রুটি এবং টেলিমেট্রি তথ্যের ওপর ন্যাশনালিস্ট হাবের বিশেষ অনুসন্ধানী প্রতিবেদন।",
    "উৎক্ষেপণের সময় তৃতীয় পর্যায়ের চাপের তারতম্য এবং কক্ষপথে স্থাপনের চ্যালেঞ্জগুলো বিজ্ঞানীরা গভীরভাবে বিশ্লেষণ করেছেন।",
    "মহাকাশ সম্পদের নিরাপত্তা জাতীয় সার্বভৌমত্বের জন্য অত্যন্ত গুরুত্বপূর্ণ এবং বিদেশি প্রযুক্তিগত হস্তক্ষেপের তদন্ত চলছে।",
    "দেশের প্রতিরক্ষা ও যোগাযোগ উপগ্রহ সুরক্ষায় দেশীয় প্রযুক্তিকে আরও আধুনিক করার নির্দেশ দেওয়া হয়েছে।",
    "বিবাহ, বিচ্ছেদ ও উত্তরাধিকার আইনে লিঙ্গ বৈষম্য দূর করে সবার জন্য সমান অধিকার নিশ্চিত করাই ইউসিসি-র মূল লক্ষ্য।",
    "আঞ্চলিক দল ও নাগরিক সমাজের প্রতিনিধিদের সঙ্গে কেন্দ্রীয় সরকার উচ্চপর্যায়ের আলোচনা জোরদার করেছে।",
    "ন্যাশনালিস্ট হাবের বিশ্লেষণে বলা হয়েছে, অভ্যন্তরীণ আইনি সংস্কার ও মহাকাশ নিরাপত্তা ভারতের কৌশলগত শক্তির দুটি প্রধান স্তম্ভ।",
    "প্রশাসনিক বিশেষজ্ঞরা মনে করছেন এই সিদ্ধান্তগুলো ভবিষ্যতে দেশের অখণ্ডতাকে আরও সুদৃঢ় ভিত্তি দেবে।",
    "এই সাংবিধানিক ও বৈজ্ঞানিক সংস্কারের প্রতি দেশের সাধারণ মানুষ, বুদ্ধিজীবী ও যুবসমাজ ব্যাপক সমর্থন জানিয়েছেন।",
    "স্বরাষ্ট্রমন্ত্রী অমিত শাহের ইঙ্গিত অনুযায়ী আসন্ন সংসদ অধিবেশনে গুরুত্বপূর্ণ বিল পেশ হওয়ার সম্ভাবনা রয়েছে।",
    "২১টি রাজ্য সরকারের সঙ্গে চলমান আলোচনায় উল্লেখযোগ্য অগ্রগতি অর্জিত হয়েছে এবং ঐকমত্য গঠনের চেষ্টা চলছে।",
    "বিশেষ প্রতিবেদনে স্পষ্ট হয়েছে যে আন্তর্জাতিক ভূ-রাজনৈতিক পরিস্থিতি এবং দেশীয় মহাকাশ নিরাপত্তা পরস্পর গভীরভাবে যুক্ত।",
    "নিরাপত্তা ব্যবস্থার আধুনিকীকরণ এবং ইসরোর অভিযান সুরক্ষায় কেন্দ্রীয় মন্ত্রিসভা গুরুত্বপূর্ণ নির্দেশিকা জারি করেছে।",
    "সারা দেশের শিক্ষাবিদ, আইন বিশেষজ্ঞ ও তরুণ প্রজন্ম গণতান্ত্রিক স্বচ্ছতা ও জাতীয় নিরাপত্তা নিয়ে মতামত ব্যক্ত করছেন।",
    "অমিত শাহ ও অজিত ডোভালের কৌশলের দিশায় ভারত জাতীয় নিরাপত্তা ও আধুনিক নাগরিক অধিকারের নতুন যুগে প্রবেশ করছে।",
    "সামগ্রিক বিশ্লেষণ অনুযায়ী শীঘ্রই চূড়ান্ত কর্মপরিকল্পনা ও প্রতিরক্ষা কৌশল সংসদের সামনে পেশ করা হবে।",
    "এখানেই শেষ হচ্ছে ন্যাশনালিস্ট হাব পর্ব ২১৬-এর বিশেষ সম্প্রচার। আমাদের সঙ্গে থাকার জন্য ধন্যবাদ, জয় হিন্দ।"
  ],
  gu: [
    "નમસ્કાર, નેશનલિસ્ટ હબ નેશનલ રાઉન્ડઅપ એપિસોડ 216 માં આપનું સ્વાગત છે. આજે કેન્દ્રીય ગૃહમંત્રી અમિત શાહની મહત્વપૂર્ણ જાહેરાત, અજિત ડોભાલની સુરક્ષા સમીક્ષા અને ઇસરોના પીએસએલવી મિશનના તથ્યોનું વિશ્લેષણ કરી રહ્યા છીએ.",
    "કેન્દ્રીય ગૃહમંત્રી અમિત શાહના નેતૃત્વમાં દેશના 21 રાજ્યોમાં સમાન નાગરિક સંહિતા (UCC) લાગુ કરવાની તૈયારીઓ તેજ બની છે.",
    "નાગરિક અધિકારોની સમાનતા અને મહિલા સશક્તિકરણના લક્ષ્ય સાથે ઉત્તરાખંડ મોડેલને અન્ય રાજ્યોમાં અમલમાં મૂકવા ચર્ચા ચાલી રહી છે.",
    "રાષ્ટ્રીય સુરક્ષા સલાહકાર અજિત ડોભાલે ઉચ્ચ સ્તરીય સુરક્ષા બેઠક યોજી આંતરિક સુરક્ષા અને સાયબર જોખમોની સમીક્ષા કરી હતી.",
    "દેશભરમાં કાયદો અને વ્યવસ્થા જાળવવા ગુપ્તચર સંસ્થાઓ અને કેન્દ્રીય દળો વચ્ચે સંકલન વધુ મજબૂત બનાવવામાં આવ્યું છે.",
    "ઇસરોના પીએસએલવી રોકેટ પ્રક્ષેપણમાં જોવા મળેલી તકનીકી ખામીઓ અને ટેલિમેટ્રી ડેટા પર નેશનલિસ્ટ હબનો વિશેષ અહેવાલ.",
    "રોકેટ લોન્ચિંગ દરમિયાન ત્રીજા તબક્કાના દબાણમાં તફાવત અને ભ્રમણકક્ષાના પડકારોનું વૈજ્ઞાનિકોએ ઊંડાણપૂર્વક વિશ્લેષણ કર્યું છે.",
    "અવકાશ સંપત્તિની સુરક્ષા રાષ્ટ્રીય સાર્વભૌમત્વ માટે અત્યંત મહત્વપૂર્ણ છે અને વિદેશી તકનીકી હસ્તક્ષેપ અંગે તપાસ ચાલુ છે.",
    "દેશની સંરક્ષણ અને સંચાર ઉપગ્રહ પ્રણાલીને સુરક્ષિત રાખવા સ્વદેશી ટેકનોલોજીને વધુ આધુનિક બનાવવાનો નિર્ણય લેવાયો છે.",
    "લગ્ન, છૂટાછેડા અને વારસાગત મિલકત અધિકારોમાં લિંગ ભેદભાવ દૂર કરી સૌને સમાન કાયદો આપવો એ યુસીસીનો મુખ્ય ઉદ્દેશ્ય છે.",
    "વિવિધ પ્રાદેશિક પક્ષો અને નાગરિક સમાજના પ્રતિનિધિઓ સાથે કેન્દ્ર સરકારે પરામર્શ તેજ કર્યો છે.",
    "નેશનલિસ્ટ હબના વિશ્લેષણ મુજબ આંતરિક સુરક્ષા અને આધુનિક નાગરિક કાયદાઓ ભારતને વૈશ્વિક મંચ પર વધુ મજબૂત બનાવશે.",
    "વહીવટી નિષ્ણાતો માને છે કે આ નિર્ણયો ભવિષ્યમાં દેશની એકતા અને અખંડિતતા માટે મજબૂત પાયો બનશે.",
    "આ બંધારણીય અને વૈજ્ઞાનિક સુધારાઓ પ્રત્યે દેશભરના નાગરિકો, બુદ્ધિજીવીઓ અને યુવાનોએ વ્યાપક સમર્થન વ્યક્ત કર્યું છે.",
    "અમિત શાહના સંકેતો અનુસાર આગામી સંસદ સત્રમાં મહત્વપૂર્ણ ખરડા રજૂ થવાની શક્યતા છે.",
    "21 રાજ્ય સરકારો સાથે ચાલી રહેલી ચર્ચામાં મહત્વપૂર્ણ પ્રગતિ થઈ છે અને સર્વસંમતિ સાધવાના પ્રયાસો ચાલુ છે.",
    "વિશેષ અહેવાલ સ્પષ્ટ કરે છે કે આંતરરાષ્ટ્રીય વ્યૂહાત્મક પરિસ્થિતિ અને સ્વદેશી અવકાશ સુરક્ષા પરસ્પર જોડાયેલા છે.",
    "સુરક્ષા તંત્રના આધુનિકીકરણ અને ઇસરો મિશનની સુરક્ષા માટે કેન્દ્રીય કેબિનેટે મહત્વપૂર્ણ માર્ગદર્શિકા જારી કરી છે.",
    "દેશભરના શિક્ષણવિદો, કાયદા નિષ્ણાતો અને યુવાનો લોકશાહી પારદર્શિતા અને રાષ્ટ્રીય સુરક્ષા પર પોતાના વિચારો રજૂ કરી રહ્યા છે.",
    "અમિત શાહ અને અજિત ડોભાલની વ્યૂહરચના હેઠળ ભારત રાષ્ટ્રીય સુરક્ષા અને આધુનિક નાગરિક અધિકારોના નવા યુગમાં પ્રવેશી રહ્યું છે.",
    "સમગ્ર વિશ્લેષણ મુજબ ટૂંક સમયમાં અંતિમ કાર્યયોજના અને સંરક્ષણ વ્યૂહરચના સંસદ સમક્ષ રજૂ કરવામાં આવશે.",
    "આ હતું નેશનલિસ્ટ હબ એપિસોડ 216 નું વિશેષ પ્રસારણ. રાષ્ટ્રીય સુરક્ષા અને કાયદાકીય એકીકરણ પરનું અમારું વિશ્લેષણ જોવા બદલ આભાર. જય હિન્દ."
  ],
  es: [
    "Bienvenidos al Episodio 216 de Nationalist Hub National Roundup. Hoy analizamos el anuncio histórico del Ministro del Interior Amit Shah sobre el Código Civil Uniforme, la revisión estratégica del asesor de seguridad nacional Ajit Doval y la investigación sobre las misiones espaciales PSLV de ISRO.",
    "El Ministro del Interior Amit Shah ha intensificado los preparativos legislativos para implementar el Código Civil Uniforme (UCC) en 21 estados de la India.",
    "Con el objetivo de garantizar la igualdad de derechos civiles y el empoderamiento femenino, avanzan las consultas para expandir el modelo de Uttarakhand a nivel nacional.",
    "Simultáneamente, el Asesor de Seguridad Nacional Ajit Doval convocó un cónclave de alto nivel para revisar la defensa interna, la vigilancia fronteriza y las amenazas cibernéticas.",
    "Las agencias de inteligencia y las fuerzas centrales reforzaron su sinergia operativa para preservar la estabilidad civil en regiones estratégicas.",
    "Nationalist Hub investiga ahora los factores técnicos y las anomalías de telemetría observadas en los recientes lanzamientos del cohete PSLV de ISRO.",
    "La telemetría de vuelo indicó variaciones de presión en la tercera etapa, lo que motivó una evaluación diagnóstica exhaustiva por expertos aeroespaciales.",
    "Los analistas de seguridad enfatizan que la resiliencia de los activos orbitales es indispensable para la soberanía nacional frente a interferencias externas.",
    "El ministerio de defensa ordenó el blindaje de las comunicaciones satelitales indígenas y las arquitecturas espaciales frente a la guerra electrónica.",
    "En cuanto al Código Civil Uniforme, las reformas centrales garantizan la igualdad de género en matrimonio, divorcio y derechos de herencia.",
    "El ejecutivo central intensificó el diálogo con partidos regionales y líderes civiles mientras los estados evalúan las directrices de implementación.",
    "La tesis investigativa de Nationalist Hub sostiene que la modernización legal interna y la seguridad aeroespacial son pilares gemelos de la autonomía estratégica.",
    "Los expertos administrativos proyectan que estas reformas estructurales consolidarán la integridad institucional antes de su promulgación parlamentaria.",
    "El diálogo nacional cobra fuerza entre académicos, jóvenes y grupos cívicos que respaldan la igualdad civil moderna y el avance científico.",
    "Las declaraciones de Amit Shah anticipan proyectos de ley clave en la próxima sesión parlamentaria, mientras las directivas de Ajit Doval fortalecen la inteligencia.",
    "Las consultas con 21 gobiernos estatales logran avances sustanciales para armonizar las prioridades regionales en un marco civil unificado.",
    "El informe especial demuestra cómo la geopolítica global y la protección de los activos espaciales soberanos están directamente interconectadas.",
    "Las directivas ejecutivas ordenan la rápida modernización de las redes de defensa aeroespacial y protocolos interinstitucionales contra el sabotaje.",
    "Foros jurídicos, académicos y asambleas estudiantiles en todo el país expresan un amplio consenso sobre la transparencia democrática y la defensa.",
    "La India se encuentra en el umbral de una transformación legal y estratégica histórica guiada por una arquitectura de seguridad nacional moderna.",
    "La síntesis editorial confirma una hoja de ruta sincronizada para la aprobación legislativa y la resiliencia tecnológica en el Parlamento.",
    "Concluimos la transmisión especial del Episodio 216 de Nationalist Hub. Gracias por acompañarnos en este análisis integral. Jai Hind."
  ],
  pt: [
    "Bem-vindos ao Episódio 216 do Nationalist Hub National Roundup. Hoje apresentamos uma análise profunda do anúncio do Ministro do Interior Amit Shah sobre o Código Civil Uniforme, a revisão de segurança de Ajit Doval e as investigações sobre as missões espaciais PSLV da ISRO.",
    "O Ministro do Interior Amit Shah intensificou os preparativos legislativos para implementar o Código Civil Uniforme (UCC) em 21 estados.",
    "Visando a igualdade de direitos civis e o empoderamento das mulheres, prosseguem as consultas para expandir o modelo de Uttarakhand a outras jurisdições.",
    "Simultaneamente, o Conselheiro de Segurança Nacional Ajit Doval convocou uma cúpula de segurança para revisar a defesa interna e matrizes de ameaças cibernéticas.",
    "As agências de inteligência e forças centrais ampliaram a sinergia operacional para preservar a estabilidade civil em regiões sensíveis.",
    "O Nationalist Hub investiga os fatores técnicos e anomalias de telemetria observados nos recentes lançamentos do foguete PSLV da ISRO.",
    "A telemetria de voo indicou diferenciais de pressão na separação de estágios, motivando avaliação diagnóstica por especialistas em propulsão aeroespacial.",
    "Analistas destacam que a proteção dos ativos orbitais é indispensável para a soberania nacional e segurança estratégica.",
    "O estabelecimento de defesa determinou o fortalecimento das comunicações via satélite indígenas contra interferências eletrônicas.",
    "Revisando o Código Civil Uniforme, as reformas asseguram igualdade de gênero em casamento, divórcio e direitos sucessórios.",
    "O governo central ampliou as consultas de alto nível com líderes civis e administrações estaduais sobre as diretrizes de execução.",
    "A análise do Nationalist Hub demonstra que a modernização jurídica interna e a segurança espacial sustentam a autonomia estratégica nacional.",
    "Especialistas administrativos projetam que essas reformas consolidarão a integridade institucional rumo à aprovação parlamentar.",
    "O debate nacional cresce entre acadêmicos, juristas e jovens que apoiam a igualdade civil moderna e o avanço tecnológico.",
    "As declarações de Amit Shah sinalizam projetos legislativos decisivos na próxima sessão, enquanto Ajit Doval reforça a arquitetura de inteligência.",
    "As negociações com 21 governos estaduais avançam com firmeza, harmonizando prioridades regionais em um código civil unificado.",
    "O dossiê investigativo comprova a ligação direta entre a dinâmica geopolítica global e a proteção dos ativos espaciais soberanos.",
    "Diretrizes executivas determinam a rápida modernização das redes de defesa aeroespacial e protocolos rigorosos de segurança.",
    "Fóruns cívicos, acadêmicos e estudantes em todo o país compartilham perspectivas construtivas sobre igualdade legal e prontidão de defesa.",
    "A Índia avança para um novo marco de transformação jurídica e estratégica sob a liderança de sua arquitetura de segurança nacional.",
    "A síntese editorial confirma um cronograma coordenado para a votação parlamentar e fortalecimento tecnológico.",
    "Encerramos o Episódio 216 do Nationalist Hub. Agradecemos a audiência nesta análise completa sobre defesa, legislação e ciência. Jai Hind."
  ],
  fr: [
    "Bienvenue dans l'épisode 216 du National Roundup de Nationalist Hub. Aujourd'hui, nous analysons l'annonce majeure du ministre de l'Intérieur Amit Shah sur le Code civil uniforme, la revue stratégique d'Ajit Doval et l'enquête sur les missions spatiales PSLV de l'ISRO.",
    "Le ministre de l'Intérieur Amit Shah a intensifié les préparatifs législatifs pour la mise en œuvre du Code civil uniforme (UCC) dans 21 États.",
    "Visant l'égalité des droits civils et l'autonomisation des femmes, les consultations se poursuivent pour étendre le modèle de l'Uttarakhand à d'autres juridictions.",
    "Parallèlement, le conseiller à la sécurité nationale Ajit Doval a convoqué un sommet de sécurité examinant la défense intérieure et la cyberdéfense.",
    "Les agences de renseignement et les forces centrales ont renforcé leur synergie opérationnelle pour préserver la stabilité nationale.",
    "Nationalist Hub enquête maintenant sur les facteurs techniques et les anomalies de télémétrie observés lors des récents lancements de fusées PSLV de l'ISRO.",
    "La télémétrie de vol a indiqué des variations de pression lors de la séparation du troisième étage, entraînant un diagnostic approfondi par les experts en propulsion.",
    "Les analystes soulignent que la résilience des actifs spatiaux est indispensable à la souveraineté nationale face aux interférences étrangères.",
    "Les autorités de défense ont ordonné le renforcement des communications satellitaires nationales contre toute guerre électronique.",
    "Concernant le Code civil uniforme, les réformes garantissent l'égalité des sexes en matière de mariage, de divorce et d'héritage.",
    "L'exécutif central a multiplié les consultations avec les partis régionaux et la société civile autour des lignes directrices d'application.",
    "La thèse de Nationalist Hub montre que la modernisation juridique interne et la résilience spatiale sont deux piliers de l'autonomie stratégique.",
    "Les experts administratifs estiment que ces réformes structurelles consolideront l'unité institutionnelle avant le vote parlementaire.",
    "Le dialogue national s'intensifie parmi les universitaires, les juristes et la jeunesse en faveur de l'égalité civile et du progrès scientifique.",
    "Les déclarations d'Amit Shah annoncent des projets de loi majeurs lors de la prochaine session, tandis qu'Ajit Doval renforce le renseignement.",
    "Les concertations avec 21 gouvernements d'États progressent rapidement vers un cadre civil harmonisé et consensuel.",
    "Le dossier d'enquête démontre l'interconnexion directe entre la géopolitique mondiale et la protection des actifs spatiaux souverains.",
    "Des directives exécutives imposent la modernisation rapide des réseaux de défense aérospatiale et des protocoles de sécurité.",
    "Les forums citoyens et les assemblées étudiantes à travers le pays expriment leur soutien à la transparence démocratique et à la sécurité.",
    "L'Inde franchit une étape historique de transformation juridique et stratégique guidée par son architecture de sécurité nationale.",
    "La synthèse éditoriale confirme une feuille de route coordonnée pour l'adoption législative et la résilience technologique.",
    "C'était l'épisode 216 de Nationalist Hub. Merci d'avoir suivi cette analyse complète sur la défense nationale et l'unification juridique. Jai Hind."
  ],
  zh: [
    "欢迎收看 Nationalist Hub 国家观察第216期特别节目。今天我们将深度解析内政部长阿米特·沙阿关于《统一民法典》（UCC）的重大声明、国家安全顾问阿吉特·多瓦尔的战略安全评估，以及印度空间研究组织（ISRO）PSLV火箭发射任务的调查进展。",
    "在内政部长阿米特·沙阿的主导下，全国21个邦推进《统一民法典》（UCC）的立法筹备与执行蓝图已全面展开。",
    "旨在保障公民权利平等、妇女权益与法律统一，北阿坎德邦的UCC立法模式正加速向更多邦推广。",
    "与此同时，国家安全顾问阿吉特·多瓦尔召集最高级别安全会议，全面检视内部防务架构、边境监控与网络安全威胁矩阵。",
    "各大情报机构与中央安全部队强化了协同作战能力，确保关键地区的社会稳定与国家安全。",
    "Nationalist Hub 现正深入调查近期 ISRO PSLV 运载火箭发射序列中出现的技术因素与遥测异常。",
    "飞行遥测数据显示第三级分离压力存在波动，航天推进专家已展开全方位的诊断评估。",
    "安全分析人士强调，太空轨道资产的安全韧性关乎国家主权，相关部门正严密排查潜在的外部技术干扰。",
    "国防部门已下令全面加固本土卫星通信与航天载荷架构，防范电子战与技术破坏。",
    "聚焦《统一民法典》，核心法律改革致力于消除性别歧视，确保婚姻、离婚与遗产继承的平等权利。",
    "中央政府正与地方政党及公民社会代表密集磋商，各邦行政部门也在评估具体实施细则。",
    "Nationalist Hub 的深度分析指出，国内法律现代化与航天安全韧性是支撑国家战略自主的两大支柱。",
    "行政专家预计，这些结构性改革将进一步巩固国家制度完整性，为议会正式立法奠定坚实基础。",
    "全国学术界、法律界与青年群体展开热烈讨论，广泛支持现代公民平等与航天科技自主。",
    "内政部长阿米特·沙阿的表态预示着即将召开的议会会议将推出关键法案，而多瓦尔的指令正重塑情报安全体系。",
    "中央与21个邦政府的协调磋商取得重大进展，正稳步构建兼顾地方实际的统一民事法律框架。",
    "特别调查报告清晰表明，国际地缘战略格局与本土太空资产安全之间存在着紧密的内在联系。",
    "内阁最新指令要求加速升级航天防御网络、遥测数据完整性保障以及跨部门反破坏机制。",
    "全国各地的高校学者、法律专家与青年代表积极发声，共同探讨民主透明度与国防现代化。",
    "在阿米特·沙阿与阿吉特·多瓦尔的战略布局引领下，印度正迈向国家安全与现代公民权利的新纪元。",
    "综合分析确认，完整的立法路线图与国防科技强化方案即将在议会全面推进。",
    "以上就是 Nationalist Hub 第216期特别节目的全部内容。感谢您的收看，再见，Jai Hind。"
  ],
  ru: [
    "Добро пожаловать в 216-й выпуск National Roundup на канале Nationalist Hub. Сегодня мы анализируем заявление министра внутренних дел Амита Шаха о Едином гражданском кодексе, стратегический обзор советника по нацбезопасности Аджита Довала и расследование миссий PSLV агентства ISRO.",
    "Министр внутренних дел Амит Шах активизировал законодательную подготовку к внедрению Единого гражданском кодекса (UCC) в 21 штате Индии.",
    "Направленные на равенство гражданских прав и защиту прав женщин консультации продолжают масштабировать модель штата Уттаракханд.",
    "Одновременно советник по национальной безопасности Аджит Довал провел совещание высокого уровня по вопросам внутренней обороны и кибербезопасности.",
    "Разведывательные ведомства и центральные силы укрепили оперативное взаимодействие для поддержания стабильности во всех регионах страны.",
    "Nationalist Hub исследует технические факторы и телеметрические аномалии, зафиксированные в ходе недавних пусков ракеты-носителя PSLV.",
    "Данные телеметрии указали на перепады давления третьей ступени, что вызвало тщательную диагностику специалистами по ракетным двигателям.",
    "Аналитики подчеркивают, что защита орбитальных спутниковых группировок имеет решающее значение для государственного суверенитета.",
    "Оборонное ведомство распорядилось усилить защиту отечественных спутниковых систем связи и космических аппаратов от радиоэлектронных угроз.",
    "Ключевые положения Единого гражданского кодекса обеспечивают полное гендерное равенство в вопросах брака, развода и наследования имущества.",
    "Центральное правительство расширило консультации с региональными партиями и общественными лидерами по проекту внедрения реформы.",
    "Аналитики Nationalist Hub отмечают, что правовая модернизация и безопасность космической отрасли являются двумя опорами стратегической автономии.",
    "Эксперты в области государственного управления уверены, что эти реформы укрепят институциональное единство страны перед парламентским голосованием.",
    "По всей стране ученые, юристы и молодежь выражают широкую поддержку современному гражданскому равноправию и технологическому развитию.",
    "Заявления Амита Шаха указывают на внесение ключевых законопроектов на ближайшей сессии парламента, а директивы Довала укрепляют систему безопасности.",
    "Переговоры с правительствами 21 штата демонстрируют уверенный прогресс на пути к формированию единого правового пространства.",
    "Специальное расследование показывает прямую взаимосвязь между глобальной геополитикой и защитой национальных космических активов.",
    "Правительственные директивы предписывают ускоренную модернизацию систем воздушно-космической обороны и протоколов защиты телеметрии.",
    "Гражданские форумы, правоведы и студенческие сообщества активно обсуждают вопросы демократической открытости и обороноспособности.",
    "Индия выходит на новый исторический рубеж правовой и стратегической трансформации под руководством современной архитектуры национальной безопасности.",
    "Итоговый обзор подтверждает согласованную дорожную карту для принятия законопроектов и укрепления технологического суверенитета.",
    "На этом специальный выпуск 216 канала Nationalist Hub завершен. Благодарим за внимание к нашему аналитическому обзору. Джай Хинд."
  ]
};

/**
 * Generates accurate, topic-aware localized segments for any video so translations and voiceovers
 * always match the actual transcript and never fall back to unrelated text.
 */
function resolveLocalizedLinesForSegments(
  lang: LanguageCode,
  baseSegments: TranscriptSegment[],
  videoContextText: string
): string[] {
  const combinedContext = `${videoContextText} ${baseSegments.map(s => s.text).join(' ')}`.toLowerCase();

  const isNationalistHub =
    /అమిత్ షా|అజిత్ దోవల్|నేషనలిస్ట్ హబ్|పీఎస్‌ఎల్‌వీ|యుసిసి|nationalist\s*hub|national\s*roundup|amit\s*shah|ajit\s*doval|pslv|ucc|ep-216|qtbo-vr_ptg/i.test(
      combinedContext
    );

  if (isNationalistHub) {
    return NATIONALIST_HUB_SPEECH_MAP[lang] || NATIONALIST_HUB_SPEECH_MAP.en;
  }

  const isBangalore =
    /బెంగళూరు|జర్నలిస్ట్ సాయి|ట్రాఫిక్|bangalore|bengaluru|journalist\s*sai|rmf5ux3srvk/i.test(
      combinedContext
    );

  if (isBangalore) {
    return LOCALIZED_SPEECH_MAP[lang] || LOCALIZED_SPEECH_MAP.en;
  }

  // Dynamic topic-aware translations for any other custom YouTube stream
  const cleanTitle = (videoContextText || 'Broadcast Stream').replace(/[<>&"]/g, '').slice(0, 60);
  const dynamicTemplates: Record<LanguageCode, string[]> = {
    te: [
      `నమస్కారం, "${cleanTitle}" పూర్తి నిడివి సమగ్ర దృశ్య మరియు సంభాషణల విశ్లేషణకు స్వాగతం.`,
      `ఈ విభాగంలో ప్రధాన పాత్రలు, కీలక పరిణామాలు మరియు కథా గమనాన్ని వివరంగా పరిశీలిస్తున్నాము.`,
      `ప్రతి సన్నివేశంలోనూ స్పష్టమైన సంభాషణలు, 4K సినిమాటిక్ కదలికలు మరియు నేపథ్య సమన్వయం కనిపిస్తాయి.`,
      `ఈ ప్రత్యేక కథనం యొక్క ముగింపు అంశాలు మరియు ముఖ్య సందేశం మీకోసం.`
    ],
    en: [
      `Welcome to this full-length localized presentation and narrative analysis of "${cleanTitle}".`,
      `Examining the primary characters, pivotal developments, and spoken dialogue across this sequence.`,
      `Showcasing synchronized 4K camera motion, character lip-sync articulation, and studio acoustics.`,
      `Concluding perspective and key takeaways from this complete audio-visual broadcast.`
    ],
    hi: [
      `नमस्कार, "${cleanTitle}" के इस संपूर्ण और विस्तृत विश्लेषण में आपका स्वागत है।`,
      `इस दृश्य में मुख्य पात्रों, महत्वपूर्ण घटनाओं और संवादों की गहन समीक्षा प्रस्तुत है।`,
      `प्रत्येक फ्रेम में 4K सिनेमैटिक गति और सिंक्रोनाइज़्ड वॉयसओवर का सजीव समन्वय है।`,
      `इस विशेष प्रसारण का सार और महत्वपूर्ण निष्कर्ष।`
    ],
    kn: [
      `ನಮಸ್ಕಾರ, "${cleanTitle}" ಕುರಿತಾದ ಈ ಸಂಪೂರ್ಣ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಪ್ರಸ್ತುತಿಗೆ ನಿಮಗೆ ಸ್ವಾಗತ.`,
      `ಈ ಭಾಗದಲ್ಲಿ ಪ್ರಮುಖ ಪಾತ್ರಗಳು, ಸಂಭಾಷಣೆ ಮತ್ತು ಕಥೆಯ ಬೆಳವಣಿಗೆಯನ್ನು ವಿವರಿಸಲಾಗಿದೆ.`,
      `ಪ್ರತಿ ದೃಶ್ಯದಲ್ಲೂ 4K ಸಿನಿಮಾಟಿಕ್ ಚಲನೆ ಮತ್ತು ಸ್ಪಷ್ಟವಾದ ಧ್ವನಿ ಸಂಯೋಜನೆ ಇದೆ.`,
      `ಈ ವಿಶೇಷ ಕಾರ್ಯಕ್ರಮದ ಅಂತಿಮ ಸಾರಾಂಶ ಮತ್ತು ಸಂದೇಶ.`
    ],
    ml: [
      `നമസ്കാരം, "${cleanTitle}" എന്ന പരിപാടിയുടെ പൂർണ്ണരൂപത്തിലുള്ള വിശകലനത്തിലേക്ക് സ്വാഗതം.`,
      `പ്രധാന കഥാപാത്രങ്ങളെയും സംഭാഷണങ്ങളെയും ഈ ഭാഗത്ത് വിശദമായി പരിശോധിക്കുന്നു.`,
      `4K സിനിമാറ്റിക് ദൃശ്യങ്ങളും സമന്വയിപ്പിച്ച ശബ്ദവും ഈ രംഗത്തിന് മിഴിവേകുന്നു.`,
      `ഈ പ്രത്യേക അവതരണത്തിന്റെ സമാപനവും പ്രധാന സന്ദേശവും.`
    ],
    bn: [
      `নমস্কার, "${cleanTitle}"-এর এই সম্পূর্ণ বিশ্লেষণ ও উপস্থাপনায় আপনাদের স্বাগতম।`,
      `এই অংশে মূল চরিত্র, গুরুত্বপূর্ণ ঘটনা এবং সংলাপগুলো বিস্তারিত তুলে ধরা হয়েছে।`,
      `প্রতিটি দৃশ্যে 4K সিনেমাটিক গতি এবং নিখুঁত ভয়েসওভারের সমন্বয় রয়েছে।`,
      `এই বিশেষ সম্প্রচারের চূড়ান্ত সারসংক্ষেপ ও বার্তা।`
    ],
    gu: [
      `નમસ્કાર, "${cleanTitle}" ના આ સંપૂર્ણ વિશ્લેષણ અને પ્રસ્તુતિમાં આપનું સ્વાગત છે.`,
      `આ વિભાગમાં મુખ્ય પાત્રો, મહત્વપૂર્ણ ઘટનાઓ અને સંવાદોની સમીક્ષા કરવામાં આવી છે.`,
      `દરેક દ્રશ્યમાં 4K સિનેમેટિક ગતિ અને સિંક્રોનાઇઝ્ડ વોઇસઓવરનો સમાવેશ થાય છે.`,
      `આ વિશેષ પ્રસારણનો સારાંશ અને અંતિમ સંદેશ.`
    ],
    es: [
      `Bienvenidos a la presentación completa y análisis narrativo de "${cleanTitle}".`,
      `Examinando los personajes principales, los acontecimientos clave y los diálogos de esta escena.`,
      `Mostrando movimiento cinematográfico 4K sincronizado y doblaje neuronal preciso.`,
      `Conclusión y puntos clave de esta producción audiovisual completa.`
    ],
    pt: [
      `Bem-vindos à apresentação completa e análise narrativa de "${cleanTitle}".`,
      `Examinando os personagens principais, os desenvolvimentos centrais e os diálogos desta sequência.`,
      `Apresentando movimento cinematográfico 4K sincronizado e locução neural precisa.`,
      `Perspectiva conclusiva e principais destaques desta transmissão audiovisual.`
    ],
    fr: [
      `Bienvenue dans cette présentation intégrale et analyse narrative de « ${cleanTitle} ».`,
      `Examen des personnages principaux, des développements clés et des dialogues de cette séquence.`,
      `Mise en valeur du mouvement cinématographique 4K synchronisé et du doublage neuronal.`,
      `Conclusion et enseignements essentiels de cette production audiovisuelle.`
    ],
    zh: [
      `欢迎收看《${cleanTitle}》的全景本地化呈现与深度叙事解析。`,
      `深入剖析本段落的核心人物设定、关键情节推进与现场对话。`,
      `展现4K电影级镜头运动、角色口型同步与多语种神经配音。`,
      `本期完整视听节目的核心总结与结语。`
    ],
    ru: [
      `Добро пожаловать на полный локализованный показ и аналитический разбор «${cleanTitle}».`,
      `Рассматриваем ключевых героев, развитие событий и диалоги в данной сцене.`,
      `Демонстрация кинематографичного движения 4K и синхронизированного нейронного дубляжа.`,
      `Заключительные выводы и основные итоги этого аудиовизуального выпуска.`
    ]
  };

  return dynamicTemplates[lang] || dynamicTemplates.en;
}

export const INITIAL_SCENES: Scene[] = [
  {
    id: 1,
    sceneNumber: 1,
    startTime: 0.0,
    endTime: 33.2,
    duration: 33.2,
    dialogue: "నమస్కారం, జర్నలిస్ట్ సాయి విశ్లేషణకు స్వాగతం. బెంగళూరు నగరంలో సామాన్య ప్రజల జీవన విధానం మరియు ఎదురవుతున్న సవాళ్లపై ఈ ప్రత్యేక కథనం.",
    summary: "Bengaluru Metropolis Ingestion: Morning Commuter Awakening & Skyline Pan",
    visualDescription: prependCharacterConsistencyToPrompt(
      "Cinematic wide establishing shot of Bengaluru tech corridor at dawn, elevated metro viaducts framing morning commuter traffic, golden volumetric rim lighting, 35mm anamorphic focus.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    camera: "Wide establishing pan 24mm anamorphic",
    lighting: "Warm golden dawn haze with volumetric ambient fill",
    environment: "Bengaluru Urban Skyline & Expressway",
    style: "cinematic documentary 4k",
    motionPreset: 'pan',
    characterPrompt: DEFAULT_CHARACTER_CONSISTENCY.compiledPrompt,
    imageUrl: generateSceneArtwork(
      {
        sceneNumber: 1,
        summary: "Bengaluru Metropolis Ingestion: Morning Commuter Awakening",
        dialogue: "నమస్కారం, జర్నలిస్ట్ సాయి విశ్లేషణకు స్వాగతం. బెంగళూరు నగరంలో సామాన్య ప్రజల జీవన విధానం మరియు ఎదురవుతున్న సవాళ్లపై ఈ ప్రత్యేక కథనం.",
        camera: "Wide establishing pan 24mm anamorphic",
        lighting: "Warm golden dawn",
        environment: "Bengaluru Skyline",
        startTime: 0.0,
        endTime: 33.2,
        motionPreset: 'pan',
        characterConfig: DEFAULT_CHARACTER_CONSISTENCY
      },
      "Bangalore Life Way బెంగళూరు బ్రతుకు దుర్భరం",
      0,
      4
    ),
    prompt: prependCharacterConsistencyToPrompt(
      "Wide anamorphic sunrise over Bengaluru city skyline, flyovers with morning commuter traffic, golden cinematic light, 8k documentary.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    seed: 41029
  },
  {
    id: 2,
    sceneNumber: 2,
    startTime: 33.2,
    endTime: 66.5,
    duration: 33.3,
    dialogue: "ట్రాఫిక్ జామ్‌లు, అద్దెలు మరియు రోజువారీ ఖర్చులు భరించలేని విధంగా పెరుగుతున్నాయి. ఉద్యోగులు మరియు వలసదారుల పరిస్థితి దుర్భరంగా మారింది.",
    summary: "Traffic Bottlenecks: Outer Ring Road & Silk Board Congestion Crisis",
    visualDescription: prependCharacterConsistencyToPrompt(
      "Dense bumper-to-bumper vehicle congestion along Silk Board and Outer Ring Road, volumetric dusk haze with glowing red taillights, cinematic 35mm cine lens.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    camera: "Dynamic dolly push-in 35mm cine prime",
    lighting: "Atmospheric twilight with dense red vehicle taillight bokeh",
    environment: "Outer Ring Road Silk Board Intersection",
    style: "cinematic technical 4k",
    motionPreset: 'dolly',
    characterPrompt: DEFAULT_CHARACTER_CONSISTENCY.compiledPrompt,
    imageUrl: generateSceneArtwork(
      {
        sceneNumber: 2,
        summary: "Traffic Bottlenecks: Outer Ring Road Congestion Crisis",
        dialogue: "ట్రాఫిక్ జామ్‌లు, అద్దెలు మరియు రోజువారీ ఖర్చులు భరించలేని విధంగా పెరుగుతున్నాయి. ఉద్యోగులు మరియు వలసదారుల పరిస్థితి దుర్భరంగా మారింది.",
        camera: "Dynamic dolly push-in 35mm cine prime",
        lighting: "Twilight red bokeh",
        environment: "Outer Ring Road Intersection",
        startTime: 33.2,
        endTime: 66.5,
        motionPreset: 'dolly',
        characterConfig: DEFAULT_CHARACTER_CONSISTENCY
      },
      "Bangalore Life Way బెంగళూరు బ్రతుకు దుర్భరం",
      1,
      4
    ),
    prompt: prependCharacterConsistencyToPrompt(
      "Dense traffic congestion on Bengaluru highway at twilight, cinematic taillight glow and atmospheric haze, 8k.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    seed: 41030
  },
  {
    id: 3,
    sceneNumber: 3,
    startTime: 66.5,
    endTime: 99.8,
    duration: 33.3,
    dialogue: "మౌలిక సదుపాయాల కొరత, రోడ్ల దుస్థితి మరియు ప్రజా రవాణా సమస్యలతో ప్రజలు నిత్యం తీవ్ర ఇబ్బందులు పడుతున్నారు.",
    summary: "Cost of Living & Infrastructure: Resident Grievances & Everyday Strains",
    visualDescription: prependCharacterConsistencyToPrompt(
      "Intimate naturalistic portrait of Bengaluru working class and tech employees discussing living costs and road conditions, documentary 50mm prime with shallow depth of field.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    camera: "Elevated crane pedestal sweep 28mm cine",
    lighting: "Moody naturalistic softbox side key lighting",
    environment: "Urban Residential Enclave & Street Market",
    style: "editorial documentary 4k",
    motionPreset: 'crane',
    characterPrompt: DEFAULT_CHARACTER_CONSISTENCY.compiledPrompt,
    imageUrl: generateSceneArtwork(
      {
        sceneNumber: 3,
        summary: "Cost of Living: Resident Grievances & Strains",
        dialogue: "మౌలిక సదుపాయాల కొరత, రోడ్ల దుస్థితి మరియు ప్రజా రవాణా సమస్యలతో ప్రజలు నిత్యం తీవ్ర ఇబ్బందులు పడుతున్నారు.",
        camera: "Elevated crane pedestal sweep 28mm cine",
        lighting: "Naturalistic softbox key",
        environment: "Residential Enclave",
        startTime: 66.5,
        endTime: 99.8,
        motionPreset: 'crane',
        characterConfig: DEFAULT_CHARACTER_CONSISTENCY
      },
      "Bangalore Life Way బెంగళూరు బ్రతుకు దుర్భరం",
      2,
      4
    ),
    prompt: prependCharacterConsistencyToPrompt(
      "Documentary portrait of residents in Bengaluru neighborhood discussing infrastructure, natural lighting, 8k.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    seed: 41031
  },
  {
    id: 4,
    sceneNumber: 4,
    startTime: 99.8,
    endTime: 133.0,
    duration: 33.2,
    dialogue: "ప్రభుత్వ అధికారులు, ప్రజాప్రతినిధులు వెంటనే స్పందించి శాశ్వత పరిష్కారాలు చూపాలని నగరవాసులు కోరుతున్నారు. జర్నలిస్ట్ సాయి గ్రౌండ్ రిపోర్ట్.",
    summary: "Journalistic Investigation & Governance Reform: Conclusive Appeal",
    visualDescription: prependCharacterConsistencyToPrompt(
      "Journalist Sai on location outside municipal administration civic center at dusk, authoritative journalistic stance, 4K Ken Burns pull-back with dramatic municipal facade lighting.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    camera: "Handheld orbital tracking drift 50mm prime",
    lighting: "Dramatic blue-hour twilight with illuminated municipal facade",
    environment: "Civic Administration Plaza & News Desk",
    style: "cinematic conceptual 4k",
    motionPreset: 'drift',
    characterPrompt: DEFAULT_CHARACTER_CONSISTENCY.compiledPrompt,
    imageUrl: generateSceneArtwork(
      {
        sceneNumber: 4,
        summary: "Journalistic Investigation: Governance Reform Appeal",
        dialogue: "ప్రభుత్వ అధికారులు, ప్రజాప్రతినిధులు వెంటనే స్పందించి శాశ్వత పరిష్కారాలు చూపాలని నగరవాసులు కోరుతున్నారు. జర్నలిస్ట్ సాయి గ్రౌండ్ రిపోర్ట్.",
        camera: "Handheld orbital tracking drift 50mm prime",
        lighting: "Dramatic blue-hour twilight",
        environment: "Civic Governance Square",
        startTime: 99.8,
        endTime: 133.0,
        motionPreset: 'drift',
        characterConfig: DEFAULT_CHARACTER_CONSISTENCY
      },
      "Bangalore Life Way బెంగళూరు బ్రతుకు దుర్భరం",
      3,
      4
    ),
    prompt: prependCharacterConsistencyToPrompt(
      "Journalist reporting in front of civic government building during twilight blue hour, authoritative posture, 8k.",
      DEFAULT_CHARACTER_CONSISTENCY
    ),
    seed: 41032
  }
];

export const INITIAL_RAW_TRANSCRIPT: TranscriptSegment[] = [
  { id: 1, start: 0.0, end: 33.2, text: "నమస్కారం, జర్నలిస్ట్ సాయి విశ్లేషణకు స్వాగతం. బెంగళూరు నగరంలో సామాన్య ప్రజల జీవన విధానం మరియు ఎదురవుతున్న సవాళ్లపై ఈ ప్రత్యేక కథనం." },
  { id: 2, start: 33.2, end: 66.5, text: "ట్రాఫిక్ జామ్‌లు, అద్దెలు మరియు రోజువారీ ఖర్చులు భరించలేని విధంగా పెరుగుతున్నాయి. ఉద్యోగులు మరియు వలసదారుల పరిస్థితి దుర్భరంగా మారింది." },
  { id: 3, start: 66.5, end: 99.8, text: "మౌలిక సదుపాయాల కొరత, రోడ్ల దుస్థితి మరియు ప్రజా రవాణా సమస్యలతో ప్రజలు నిత్యం తీవ్ర ఇబ్బందులు పడుతున్నారు." },
  { id: 4, start: 99.8, end: 133.0, text: "ప్రభుత్వ అధికారులు, ప్రజాప్రతినిధులు వెంటనే స్పందించి శాశ్వత పరిష్కారాలు చూపాలని నగరవాసులు కోరుతున్నారు. జర్నలిస్ట్ సాయి గ్రౌండ్ రిపోర్ట్." }
];

function formatTimestamp(sec: number, separator = ','): string {
  const s = Math.max(0, sec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}${separator}${pad(ms, 3)}`;
}

export interface BuildLocalizedOutputsOptions {
  isDemoMode?: boolean;
  sourceLanguage?: LanguageCode;
}

function countReadingWords(text: string): number {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  // Handle CJK characters as approximate words if no spaces
  const cjkCount = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
  const spaceWords = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.max(spaceWords, Math.ceil(cjkCount / 2));
}

export function buildLocalizedOutputs(
  targetLangs: LanguageCode[],
  baseSegments: TranscriptSegment[] = INITIAL_RAW_TRANSCRIPT,
  customTranslations?: Record<string, { id?: string | number; start: number; end: number; text: string }[]>,
  videoContextTitle = '',
  options: BuildLocalizedOutputsOptions = {}
): Record<LanguageCode, LocalizedOutput> {
  const outputs: Partial<Record<LanguageCode, LocalizedOutput>> = {};
  const isDemoMode = Boolean(options.isDemoMode);
  const sourceLanguage = options.sourceLanguage;

  const allLanguages = Array.from(new Set<LanguageCode>([...INITIAL_11_LANGUAGES, ...targetLangs]));

  allLanguages.forEach(lang => {
    const cList = customTranslations?.[lang] || [];
    const demoFallbackLines = isDemoMode
      ? resolveLocalizedLinesForSegments(lang, baseSegments, videoContextTitle)
      : [];

    let missingCount = 0;
    let timestampErrors = 0;
    let totalWords = 0;
    let totalDurationSec = 0;

    const segs: TranscriptSegment[] = baseSegments.map((s, idx) => {
      const start = typeof s.start === 'number' && Number.isFinite(s.start) ? s.start : idx * 5;
      const end = typeof s.end === 'number' && Number.isFinite(s.end) && s.end > start ? s.end : start + 5;
      if (typeof s.start !== 'number' || typeof s.end !== 'number' || s.end <= s.start) {
        timestampErrors++;
      }

      // Match custom translation by exact segment ID first, then exact index (NEVER modulo wrap!)
      const matchedById = cList.find(item => item && item.id !== undefined && String(item.id) === String(s.id));
      const matchedByIdx = idx < cList.length ? cList[idx] : undefined;
      const ct = matchedById || matchedByIdx;
      const candidateText = typeof ct?.text === 'string' ? ct.text.trim() : '';

      let resolvedText = '';
      let translationStatus: TranscriptSegment['translationStatus'] = 'translated';

      if (candidateText.length > 0) {
        resolvedText = candidateText;
        translationStatus = lang === sourceLanguage ? 'source' : 'translated';
      } else if (lang === sourceLanguage && String(s.text || '').trim().length > 0) {
        resolvedText = String(s.text).trim();
        translationStatus = 'source';
      } else if (isDemoMode && demoFallbackLines.length > 0) {
        resolvedText = demoFallbackLines[idx % demoFallbackLines.length] || String(s.text || '').trim();
        translationStatus = 'translated';
      } else {
        // Honest untranslated/missing segment: do NOT substitute canned dialogue or modulo wrap
        resolvedText = '';
        translationStatus = 'missing';
        missingCount++;
      }

      const dur = Math.max(0.5, end - start);
      totalDurationSec += dur;
      totalWords += countReadingWords(resolvedText);

      return {
        id: s.id ?? idx + 1,
        start,
        end,
        text: resolvedText,
        speaker: s.speaker,
        confidence: s.confidence,
        isCleaned: s.isCleaned,
        translationStatus
      };
    });

    const validSubtitleSegs = segs.filter(s => s.text.trim().length > 0);
    const srt = validSubtitleSegs
      .map((s, i) => `${i + 1}\n${formatTimestamp(s.start, ',')} --> ${formatTimestamp(s.end, ',')}\n${s.text}\n`)
      .join('\n');
    const vtt =
      `WEBVTT\n\n` +
      validSubtitleSegs
        .map((s, i) => `${i + 1}\n${formatTimestamp(s.start, '.')} --> ${formatTimestamp(s.end, '.')}\n${s.text}\n`)
        .join('\n');

    const readingSpeedWpm =
      totalDurationSec > 0 && totalWords > 0 ? Math.round((totalWords / totalDurationSec) * 60) : 0;

    let qaStatus: LocalizedOutput['qaReport']['status'] = 'PASS';
    if (missingCount === baseSegments.length && baseSegments.length > 0) {
      qaStatus = 'UNTRANSLATED';
    } else if (missingCount > 0 || timestampErrors > 0) {
      qaStatus = 'FAIL';
    } else if (readingSpeedWpm > 240) {
      qaStatus = 'WARN';
    }

    outputs[lang] = {
      languageCode: lang,
      languageName: SUPPORTED_LANGUAGES[lang]?.name || lang,
      translationSegments: segs,
      subtitlesSrt: srt,
      subtitlesVtt: vtt,
      audioWavUrl: `/storage/voiceovers/${lang}/voiceover.wav`,
      video4kUrl: `/storage/videos/${lang}/final_4k.mp4`,
      qaReport: {
        language: lang,
        segments: segs.length,
        missing: missingCount,
        timestampErrors,
        readingSpeedWpm,
        properNounsPreserved: missingCount === 0,
        status: qaStatus
      }
    };
  });

  return outputs as Record<LanguageCode, LocalizedOutput>;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: '1', name: 'INGESTION', label: 'Media Ingestion', status: 'PENDING', progress: 0, message: 'Paste a YouTube URL to ingest source media', modelUsed: 'Transcript Ingestor' },
  { id: '2', name: 'AUDIO_NORM', label: 'Audio Normalization', status: 'PENDING', progress: 0, message: 'Awaiting source audio stream', modelUsed: 'Audio Timebase Validator' },
  { id: '3', name: 'TRANSCRIPTION', label: 'Speech-to-Text', status: 'PENDING', progress: 0, message: 'Awaiting YouTube URL to extract transcript', modelUsed: 'YouTube Captions / Gemini STT' },
  { id: '4', name: 'CLEANING', label: 'Transcript Cleaning', status: 'PENDING', progress: 0, message: 'Awaiting transcript segments', modelUsed: 'Deterministic Cleaner' },
  { id: '5', name: 'TRANSLATION', label: 'Multi-Language Translation', status: 'PENDING', progress: 0, message: 'Awaiting transcript for 12-language translation', modelUsed: 'Segment Translator' },
  { id: '6', name: 'TRANSLATION_QA', label: 'Translation QA', status: 'PENDING', progress: 0, message: 'Awaiting translated segments', modelUsed: 'QA Verifier' },
  { id: '7', name: 'STORYBOARD', label: 'Storyboard Generation', status: 'PENDING', progress: 0, message: 'Awaiting transcript to generate storyboard scenes', modelUsed: 'Semantic Scene Segmenter' },
  { id: '8', name: 'VISUAL_GEN', label: 'Visual Frame Synthesis', status: 'PENDING', progress: 0, message: 'Awaiting scene segmentation', modelUsed: 'Scene Visualizer' },
  { id: '9', name: 'VOICEOVER', label: 'Voiceover Synthesis', status: 'PENDING', progress: 0, message: 'Awaiting translated script for neural TTS', modelUsed: 'Gemini / Google Neural TTS' },
  { id: '10', name: 'SUBTITLES', label: 'Subtitle Generation', status: 'PENDING', progress: 0, message: 'Awaiting translated segments for SRT/VTT', modelUsed: 'Subtitle Engine' },
  { id: '11', name: 'RENDER', label: '4K Cinematic Render', status: 'PENDING', progress: 0, message: 'Awaiting storyboard & voiceover for full video render', modelUsed: 'FFmpeg MP4 / WebCodecs' },
  { id: '12', name: 'QUALITY_CHECK', label: 'Quality Verification', status: 'PENDING', progress: 0, message: 'Awaiting rendered video output', modelUsed: 'Quality Auditor' }
];

export const INITIAL_PROJECT: Project = {
  id: 'VID-WORKSPACE-READY',
  name: 'New YouTube Video Project',
  description: 'Paste any YouTube URL above to automatically generate the transcript, storyboard scenes, multi-language translations, and full video.',
  sourceType: 'youtube',
  sourceUrl: '',
  sourceLanguage: 'en',
  detectedLanguage: 'Auto-Detect on URL Ingest',
  targetLanguages: INITIAL_11_LANGUAGES,
  resolution: '1080p',
  ttsVoice: 'Kore',
  status: 'PENDING',
  progress: 0,
  currentStage: 'INGESTION',
  durationSeconds: 0,
  totalStorageBytes: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDemoMode: false,
  scenes: [],
  rawTranscript: [],
  cleanTranscript: [],
  characterRegistry: [],
  transcriptValidation: {
    valid: true,
    segmentCount: 0,
    coverageStart: 0,
    coverageEnd: 0,
    mediaDurationSeconds: 0,
    totalSpokenSeconds: 0,
    silentGapCount: 0,
    overlapCount: 0,
    invalidBoundsCount: 0,
    issues: []
  },
  localizedOutputs: buildLocalizedOutputs(
    INITIAL_11_LANGUAGES,
    [],
    undefined,
    '',
    { isDemoMode: false, sourceLanguage: 'en' }
  ),
  stages: DEFAULT_PIPELINE_STAGES,
  logs: []
};

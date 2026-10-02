from typing import Dict, List, Any

# Curated high-accuracy multilingual translations for sample briefing
MOCK_LOCALIZED_CORPUS = {
    "en": [
        "Welcome to the global technology and economic outlook briefing.",
        "Today we examine open architectures, verifiable sovereignty, and digital ecosystems.",
        "Decentralized processing models empower creators without mandatory subscription locks.",
        "Multilingual content bridges international communities across eleven major linguistic regions.",
        "Let us review the operational roadmap and production benchmarks for this quarter."
    ],
    "es": [
        "Bienvenidos al informe global sobre perspectivas tecnológicas y económicas.",
        "Hoy examinamos arquitecturas abiertas, soberanía verificable y ecosistemas digitales.",
        "Los modelos de procesamiento descentralizados empoderan a los creadores sin bloqueos de suscripción.",
        "El contenido multilingüe une a las comunidades internacionales en once regiones lingüísticas principales.",
        "Revisemos la hoja de ruta operativa y los puntos de referencia de producción para este trimestre."
    ],
    "pt": [
        "Bem-vindos ao panorama global de tecnologia e perspectivas econômicas.",
        "Hoje examinamos arquiteturas abertas, soberania verificável e ecossistemas digitais.",
        "Modelos de processamento descentralizados capacitam criadores sem bloqueios de assinatura obrigatória.",
        "O conteúdo multilíngue conecta comunidades internacionais em onze regiões linguísticas principais.",
        "Vamos analisar o roteiro operacional e as referências de produção para este trimestre."
    ],
    "fr": [
        "Bienvenue au point sur les perspectives économiques et technologiques mondiales.",
        "Aujourd'hui, nous examinons les architectures ouvertes, la souveraineté vérifiable et les écosystèmes numériques.",
        "Les modèles de traitement décentralisés renforcent les créateurs sans verrouillage d'abonnement.",
        "Le contenu multilingue relie les communautés internationales à travers onze régions linguistiques majeures.",
        "Examinons la feuille de route opérationnelle et les critères de production pour ce trimestre."
    ],
    "te": [
        "గ్లోబల్ టెక్నాలజీ మరియు ఆర్థిక ముందస్తు దృక్పథపు సమీక్షకు స్వాగతం.",
        "ఈ రోజు మనం ఓపెన్ ఆర్కిటెక్చర్లు, ధృవీకరించదగిన సార్వభౌమత్వం మరియు డిజిటల్ పర్యావరణ వ్యవస్థలను పరిశీలిస్తున్నాము.",
        "వికేంద్రీకృత ప్రాసెసింగ్ నమూనాలు సృష్టికర్తలను తప్పనిసరి చందా పరిమితులు లేకుండా శక్తివంతం చేస్తాయి.",
        "బహుభాషా స్థానికీకరణ ప్రధాన భాషా ప్రాంతాల అంతర్జాతీయ సమాజాలను అనుసంధానిస్తుంది.",
        "ఈ త్రైమాసికపు కార్యాచరణ ప్రణాళిక మరియు ఉత్పత్తి ప్రమాణాలను సమీక్షిద్దాం."
    ],
    "kn": [
        "ಜಾಗತಿಕ ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ಆರ್ಥಿಕ ಮುನ್ನೋಟದ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆಗೆ ಸುಸ್ವಾಗತ.",
        "ಇಂದು ನಾವು ಮುಕ್ತ ವಾಸ್ತುಶಿಲ್ಪಗಳು, ಪರಿಶೀಲಿಸಬಹುದಾದ ಸಾರ್ವಭೌಮತ್ವ ಮತ್ತು ಡಿಜಿಟಲ್ ಪರಿಸರ ವ್ಯವಸ್ಥೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತೇವೆ.",
        "ವಿಕೇಂದ್ರೀಕೃತ ಸಂಸ್ಕರಣಾ ಮಾದರಿಗಳು ಚಂದಾದಾರಿಕೆ ಬಂಧನಗಳಿಲ್ಲದೆ ಸೃಷ್ಟಿಕರ್ತರನ್ನು ಸಶಕ್ತಗೊಳಿಸುತ್ತವೆ.",
        "ಬಹುಭಾಷಾ ವಿಷಯವು ಹನ್ನೊಂದು ಪ್ರಮುಖ ಭಾಷಾ ಪ್ರದೇಶಗಳಲ್ಲಿ ಅಂತರರಾಷ್ಟ್ರೀಯ ಸಮುದಾಯಗಳನ್ನು ಬೆಸೆಯುತ್ತದೆ.",
        "ಈ ತ್ರೈಮಾಸಿಕದ ಕಾರ್ಯಾಚರಣೆಯ ಮಾರ್ಗಸೂಚಿ ಮತ್ತು ಉತ್ಪಾದನಾ ಮಾನದಂಡಗಳನ್ನು ಪರಿಶೀಲಿಸೋಣ."
    ],
    "ml": [
        "ആഗോള സാങ്കേതിക, സാമ്പത്തിക വീക്ഷണത്തിലേക്കുള്ള സംക്ഷിപ്ത വിവരണത്തിലേക്ക് സ്വാഗതം.",
        "ഇന്ന് നമ്മൾ തുറന്ന ആർക്കിടെക്ചറുകളും ഡിജിറ്റൽ പരിസ്ഥിതി വ്യവസ്ഥകളും പരിശോധിക്കുന്നു.",
        "സബ്‌സ്‌ക്രിപ്ഷൻ കുരുക്കുകളില്ലാതെ സ്രഷ്ടാക്കളെ ശാക്തീകരിക്കുന്ന വികേന്ദ്രീകൃത മാതൃകകൾ.",
        "ബഹുഭാഷാ ഉള്ളടക്കം പതിനൊന്ന് പ്രധാന ഭാഷാ മേഖലകളിലുടനീളമുള്ള അന്താരാഷ്ട്ര സമൂഹങ്ങളെ ബന്ധിപ്പിക്കുന്നു.",
        "ഈ പാദത്തിലെ പ്രവർത്തന റോഡ്‌മാപ്പും ഉൽപ്പാദന മാനദണ്ഡങ്ങളും നമുക്ക് വിലയിരുത്താം."
    ],
    "hi": [
        "वैश्विक प्रौद्योगिकी और आर्थिक दृष्टिकोण की इस प्रस्तुति में आपका स्वागत है।",
        "आज हम खुली वास्तुकला, सत्यापन योग्य संप्रभुता और डिजिटल पारिस्थितिकी तंत्र की समीक्षा करेंगे।",
        "विकेंद्रीकृत प्रसंस्करण मॉडल अनिवार्य सदस्यता के बिना रचनाकारों को सशक्त बनाते हैं।",
        "बहुभाषी सामग्री ग्यारह प्रमुख भाषाई क्षेत्रों के अंतर्राष्ट्रीय समुदायों को जोड़ती है।",
        "आइए इस तिमाही के परिचालन रोडमैप और उत्पादन बेंचमार्क का अवलोकन करें।"
    ],
    "bn": [
        "বৈশ্বিক প্রযুক্তি এবং অর্থনৈতিক দৃষ্টিভঙ্গির ব্রিফিংয়ে আপনাকে স্বাগতম।",
        "আজ আমরা উন্মুক্ত স্থাপত্য, যাচাইযোগ্য সার্বভৌমত্ব এবং ডিজিটাল ইকোসিস্টেম পরীক্ষা করব।",
        "বিকেন্দ্রীকৃত প্রক্রিয়াকরণ মডেলগুলি বাধ্যতামূলক সাবস্ক্রিপশন ছাড়াই নির্মাতাদের ক্ষমতায়িত করে।",
        "বহুভাষিক বিষয়বস্তু এগারোটি প্রধান ভাষাগত অঞ্চলের আন্তর্জাতিক সম্প্রদায়গুলিকে সংযুক্ত করে।",
        "আসুন এই ত্রৈমাসিকের অপারেশনাল রোডম্যাপ এবং উৎপাদন বেঞ্চমার্ক পর্যালোচনা করি।"
    ],
    "gu": [
        "વૈશ્વિક ટેકનોલોજી અને આર્થિક દ્રષ્ટિકોણના બ્રીફિંગમાં આપનું સ્વાગત છે.",
        "આજે આપણે ઓપન આર્કિટેક્ચર્સ અને ડિજિટલ ઇકોસિસ્ટમ્સની સમીક્ષા કરીશું.",
        "વિકેન્દ્રિત પ્રોસેસિંગ મોડલ્સ સબ્સ્ક્રિપ્શન અવરોધો વિના સર્જકોને સશક્ત બનાવે છે.",
        "બહુભાષી સામગ્રી અગિયાર મુખ્ય ભાષાકીય ક્ષેત્રોના આંતરરાષ્ટ્રીય સમુદಾಯોને જોડે છે.",
        "ચાલો આ ક્વાર્ટર માટે ઓપરેશનલ રોડમેપ અને પ્રોડક્શન બેન્ચમાર્કનું મૂલ્યાંકન કરીએ."
    ],
    "zh": [
        "欢迎来到全球技术与经济展望简报。",
        "今天我们将探讨开放式架构、可验证主权和数字化生态系统。",
        "去中心化计算模型赋予创作者自主权，无需受限于专有订阅模式。",
        "多语言本地化内容将连接覆盖全球十一个主要语系的用户群体。",
        "现在让我们共同回顾本季度的运营路线图与核心交付指标。"
    ],
    "ru": [
        "Добро пожаловать на обзор мировых технологических и экономических перспектив.",
        "Сегодня мы рассмотрим открытые архитектуры, проверяемый суверенитет и цифровые экосистемы.",
        "Децентрализованные вычислительные модели расширяют возможности авторов без привязки к платным подпискам.",
        "Многоязычная локализация объединяет международные сообщества в одиннадцати ключевых регионах.",
        "Давайте перейдем к анализу операционной дорожной карты и производственных стандартов на этот квартал."
    ]
}

MOCK_SCENE_DEFINITIONS = [
    {
        "scene_number": 1,
        "start_time": 0.0,
        "end_time": 4.5,
        "duration": 4.5,
        "visual_description": "Cinematic wide establishing shot of modern coastal skyline at sunrise, glass architecture reflecting golden light, atmospheric marine fog, 35mm anamorphic lens.",
        "camera": "Wide establishing pan right",
        "lighting": "Natural golden hour volumetric illumination",
        "environment": "Modern coastal metropolis",
        "style": "cinematic documentary",
        "seed": 1001
    },
    {
        "scene_number": 2,
        "start_time": 4.5,
        "end_time": 9.2,
        "duration": 4.7,
        "visual_description": "Clean engineering workstation featuring schematic diagrams, brushed aluminum computing chassis, optical fiber interconnects, sharp macro focus, shallow depth of field.",
        "camera": "Slow macro push-in",
        "lighting": "Subtle cool studio rim lighting with warm tungsten highlights",
        "environment": "High-tech research laboratory",
        "style": "cinematic technical",
        "seed": 1002
    },
    {
        "scene_number": 3,
        "start_time": 9.2,
        "end_time": 14.0,
        "duration": 4.8,
        "visual_description": "Architectural interior of a collaborative studio pavilion, engineers discussing digital topologies on glass displays, natural diffused window light.",
        "camera": "Medium tracking shot along curved corridor",
        "lighting": "Soft overcast daylight through frosted clerestory windows",
        "environment": "Open pavilion workspace",
        "style": "editorial documentary",
        "seed": 1003
    },
    {
        "scene_number": 4,
        "start_time": 14.0,
        "end_time": 19.5,
        "duration": 5.5,
        "visual_description": "Global communications hub with subtle holographic data visualization of interconnected linguistic nodes across continents, dark slate background.",
        "camera": "Orbital rotation 45 degrees",
        "lighting": "Deep dark slate with emerald and amber data traces",
        "environment": "Digital network operations center",
        "style": "cinematic conceptual",
        "seed": 1004
    },
    {
        "scene_number": 5,
        "start_time": 19.5,
        "end_time": 24.5,
        "duration": 5.0,
        "visual_description": "Cinematic low-angle perspective of an aerospace innovation hangar, engineers reviewing aircraft telemetry, lens flare flare across anamorphic elements.",
        "camera": "Low angle slow pedestal up",
        "lighting": "High contrast industrial sodium vapor and cool LED mix",
        "environment": "Aerospace development facility",
        "style": "cinematic industrial",
        "seed": 1005
    }
]

def get_mock_translation(text: str, target_lang: str) -> str:
    corpus = MOCK_LOCALIZED_CORPUS.get(target_lang, MOCK_LOCALIZED_CORPUS["en"])
    # Match closest segment or return corpus element
    return corpus[abs(hash(text)) % len(corpus)]

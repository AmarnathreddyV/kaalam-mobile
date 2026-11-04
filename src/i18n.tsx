import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "English" | "Telugu" | "Hindi";

const translations: Record<AppLanguage, Record<string, string>> = {
  English: {},
  Telugu: {
    "Home":"హోమ్","Panchangam":"పంచాంగం","Pooja Items":"పూజా సామగ్రి","Horoscope":"జాతకం","Profile":"ప్రొఫైల్",
    "Your details":"మీ వివరాలు","Enter your details to set up KAALAM. No account or phone login is needed. You can enter any village, town or city in India for your birth and current locations.":"కాలం ఏర్పాటు చేయడానికి మీ వివరాలను నమోదు చేయండి. ఖాతా లేదా ఫోన్ లాగిన్ అవసరం లేదు. జన్మస్థలం మరియు ప్రస్తుత స్థలంగా భారతదేశంలోని ఏ గ్రామం, పట్టణం లేదా నగరాన్నైనా నమోదు చేయవచ్చు.",
    "Full name":"పూర్తి పేరు","Date of birth (YYYY-MM-DD)":"పుట్టిన తేదీ (YYYY-MM-DD)","Time of birth (24-hour format)":"పుట్టిన సమయం (24 గంటల పద్ధతి)","Place of birth":"జన్మస్థలం","Current location":"ప్రస్తుత స్థలం","Preferred language":"ఇష్టమైన భాష","Panchangam tradition":"పంచాంగ సంప్రదాయం","Save and Continue":"సేవ్ చేసి కొనసాగించండి","Saving...":"సేవ్ అవుతోంది...","Please complete all fields.":"దయచేసి అన్ని వివరాలను పూరించండి.","Enter a valid date in YYYY-MM-DD format.":"సరైన తేదీని YYYY-MM-DD రూపంలో నమోదు చేయండి.","Enter time in 24-hour format, for example 06:30.":"సమయాన్ని 24 గంటల పద్ధతిలో నమోదు చేయండి. ఉదా: 06:30","Profile Saved":"ప్రొఫైల్ సేవ్ అయింది","Continue":"కొనసాగించండి","Unable to save profile":"ప్రొఫైల్ సేవ్ చేయలేకపోయాం",
    "Namaskaram,":"నమస్కారం,","Your day, in alignment.":"మీ రోజు శుభప్రదంగా సాగాలి.","Pooja Items & Samagri":"పూజా వస్తువులు మరియు సామగ్రి","View occasion-wise preparation lists":"కార్యక్రమాల వారీగా సిద్ధం చేసుకునే జాబితాలు","VIEW  →":"చూడండి  →","YOUR ASTROLOGY PROFILE":"మీ జ్యోతిష్య వివరాలు","THIS DAY'S PANCHANGAM":"ఈ రోజు పంచాంగం","FAVOURABLE TIMINGS":"శుభ సమయాలు","INAUSPICIOUS TIMINGS":"అశుభ సమయాలు","TODAY'S SPIRITUAL GUIDANCE":"ఈ రోజు ఆధ్యాత్మిక మార్గదర్శకం","Sunrise":"సూర్యోదయం","Sunset":"సూర్యాస్తమయం","Rahu Kalam":"రాహుకాలం","Yamagandam":"యమగండం","Gulika Kalam":"గుళిక కాలం","Loading today's Panchangam…":"ఈ రోజు పంచాంగం లోడ్ అవుతోంది…","Try again":"మళ్లీ ప్రయత్నించండి","Not calculated":"లెక్కించలేదు","Not provided":"అందించలేదు","Unavailable":"అందుబాటులో లేదు",
    "Pooja Items":"పూజా సామగ్రి","Preparation checklists for common Hindu ceremonies and poojas.":"హిందూ శుభకార్యాలు మరియు పూజల కోసం సిద్ధం చేసుకునే జాబితాలు.","CHOOSE AN OCCASION":"కార్యక్రమాన్ని ఎంచుకోండి","PERSONAL DETAILS":"వ్యక్తిగత వివరాలు","Preferences & location":"ప్రాధాన్యతలు మరియు స్థలం","Name":"పేరు","Email":"ఈమెయిల్","Date of birth":"పుట్టిన తేదీ","Time of birth":"పుట్టిన సమయం","Language":"భాష","Not added":"జోడించలేదు","Not set":"సెట్ చేయలేదు","Your details and preferences":"మీ వివరాలు మరియు ప్రాధాన్యతలు",
    "Horoscope":"జాతకం","Your Vedic birth-chart details":"మీ వేద జాతక వివరాలు","Personal horoscope":"వ్యక్తిగత జాతకం","Your birth chart":"మీ జన్మ జాతకం","Birth details":"జనన వివరాలు","Chandra Rashi":"చంద్ర రాశి","Janma Nakshatra":"జన్మ నక్షత్రం","Nakshatra Pada":"నక్షత్ర పాదం","Lagna":"లగ్నం","Date":"తేదీ","Time":"సమయం","Place":"స్థలం",
    "May your day be peaceful and blessed.":"మీ రోజు ప్రశాంతంగా, శుభప్రదంగా ఉండాలి.","Mute music":"సంగీతాన్ని ఆపండి","Turn music on":"సంగీతాన్ని ప్రారంభிக்கండి","Continue to KAALAM  →":"కాలం యాప్‌లోకి వెళ్లండి  →","KAALAM · TODAY'S DIVINE BLESSING":"కాలం · ఈ రోజు దైవ ఆశీస్సులు"
  },
  Hindi: {
    "Home":"होम","Panchangam":"पंचांग","Pooja Items":"पूजा सामग्री","Horoscope":"कुंडली","Profile":"प्रोफ़ाइल",
    "Your details":"आपकी जानकारी","Enter your details to set up KAALAM. No account or phone login is needed. You can enter any village, town or city in India for your birth and current locations.":"KAALAM सेट करने के लिए अपनी जानकारी दर्ज करें। किसी खाते या फोन लॉगिन की आवश्यकता नहीं है। जन्मस्थान और वर्तमान स्थान के लिए भारत का कोई भी गाँव, कस्बा या शहर दर्ज कर सकते हैं।",
    "Full name":"पूरा नाम","Date of birth (YYYY-MM-DD)":"जन्म तिथि (YYYY-MM-DD)","Time of birth (24-hour format)":"जन्म समय (24 घंटे के प्रारूप में)","Place of birth":"जन्म स्थान","Current location":"वर्तमान स्थान","Preferred language":"पसंदीदा भाषा","Panchangam tradition":"पंचांग परंपरा","Save and Continue":"सहेजें और आगे बढ़ें","Saving...":"सहेजा जा रहा है...","Please complete all fields.":"कृपया सभी जानकारी भरें।","Enter a valid date in YYYY-MM-DD format.":"सही तारीख YYYY-MM-DD प्रारूप में दर्ज करें।","Enter time in 24-hour format, for example 06:30.":"समय 24 घंटे के प्रारूप में दर्ज करें, जैसे 06:30।","Profile Saved":"प्रोफ़ाइल सहेजी गई","Continue":"जारी रखें","Unable to save profile":"प्रोफ़ाइल सहेजी नहीं जा सकी",
    "Your day, in alignment.":"आपका दिन शुभ और संतुलित हो।","Pooja Items & Samagri":"पूजा सामग्री और सामान","View occasion-wise preparation lists":"अवसर के अनुसार तैयारी की सूची देखें","VIEW  →":"देखें  →","YOUR ASTROLOGY PROFILE":"आपकी ज्योतिष प्रोफ़ाइल","THIS DAY'S PANCHANGAM":"आज का पंचांग","FAVOURABLE TIMINGS":"शुभ समय","INAUSPICIOUS TIMINGS":"अशुभ समय","TODAY'S SPIRITUAL GUIDANCE":"आज का आध्यात्मिक मार्गदर्शन","Sunrise":"सूर्योदय","Sunset":"सूर्यास्त","Rahu Kalam":"राहु काल","Yamagandam":"यमगण्ड","Gulika Kalam":"गुलिक काल","Loading today's Panchangam…":"आज का पंचांग लोड हो रहा है…","Try again":"फिर से प्रयास करें","Not calculated":"गणना नहीं हुई","Not provided":"दिया नहीं गया","Unavailable":"उपलब्ध नहीं",
    "Preparation checklists for common Hindu ceremonies and poojas.":"हिंदू संस्कारों और पूजाओं की तैयारी के लिए सूचियाँ।","CHOOSE AN OCCASION":"अवसर चुनें","PERSONAL DETAILS":"व्यक्तिगत जानकारी","Preferences & location":"पसंद और स्थान","Name":"नाम","Email":"ईमेल","Date of birth":"जन्म तिथि","Time of birth":"जन्म समय","Language":"भाषा","Not added":"जोड़ा नहीं गया","Not set":"सेट नहीं है","Your details and preferences":"आपकी जानकारी और पसंद",
    "Your Vedic birth-chart details":"आपकी वैदिक जन्म कुंडली का विवरण","Personal horoscope":"व्यक्तिगत कुंडली","Your birth chart":"आपकी जन्म कुंडली","Birth details":"जन्म विवरण","Chandra Rashi":"चंद्र राशि","Janma Nakshatra":"जन्म नक्षत्र","Nakshatra Pada":"नक्षत्र पद","Lagna":"लग्न","Date":"तारीख","Time":"समय","Place":"स्थान",
    "May your day be peaceful and blessed.":"आपका दिन शांतिमय और मंगलमय हो।","Mute music":"संगीत बंद करें","Turn music on":"संगीत चालू करें","Continue to KAALAM  →":"KAALAM पर आगे बढ़ें  →","KAALAM · TODAY'S DIVINE BLESSING":"KAALAM · आज का दिव्य आशीर्वाद"
  }
};

type LanguageContextValue = { language: AppLanguage; setLanguage: (language: AppLanguage) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue>({ language: "English", setLanguage: () => undefined, t: (text) => text });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("English");
  useEffect(() => {
    AsyncStorage.getItem("kaalam-language").then(value => {
      if (value === "Telugu" || value === "Hindi" || value === "English") setLanguageState(value);
    }).catch(() => undefined);
  }, []);
  const setLanguage = (value: AppLanguage) => {
    setLanguageState(value);
    AsyncStorage.setItem("kaalam-language", value).catch(() => undefined);
  };
  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => translations[language][text] || text }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }

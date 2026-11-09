export type Stotram = { id: string; title: string; text: string; meaning: string };
export const stotramsByAlbum: Record<string, Stotram[]> = {
  venkateswara: [
    { id:"venkatesha-mangalam", title:"Sri Venkateswara Mangala Slokam", text:"ॐ नमो वेंकटेशाय।\nश्रियः कान्ताय कल्याणनिधये निधयेऽर्थिनाम्।\nश्रीवेङ्कटनिवासाय श्रीनिवासाय मङ्गलम्॥", meaning:"A prayer offering auspiciousness to Srinivasa, the Lord who dwells on Venkata." },
    { id:"vishnu-shantakaram", title:"Shantakaram Bhujagashayanam", text:"शान्ताकारं भुजगशयनं पद्मनाभं सुरेशम्।\nविश्वाधारं गगनसदृशं मेघवर्णं शुभाङ्गम्॥", meaning:"A meditation on Lord Vishnu, peaceful, all-supporting and compassionate." }
  ],
  hanuman: [
    { id:"hanuman-dhyana", title:"Hanuman Dhyana Slokam", text:"मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्।\nवातात्मजं वानरयूथमुख्यं श्रीरामदूतं शरणं प्रपद्ये॥", meaning:"I seek refuge in Hanuman, swift as thought, wise, disciplined and the devoted messenger of Sri Rama." },
    { id:"anjaneya-prarthana", title:"Anjaneya Prarthana", text:"अञ्जनानन्दनं वीरं जानकीशोकनाशनम्।\nकपीशमक्षहन्तारं वन्दे लङ्काभयङ्करम्॥", meaning:"A salutation to the brave son of Anjana, who comforted Sita and served Rama fearlessly." }
  ],
  murugan: [
    { id:"subrahmanya-karavalamba", title:"Sri Subrahmanya Karavalamba", text:"हे स्वामिनाथ करुणाकर दीनबन्धो।\nश्रीपार्वतीशमुखपङ्कजपद्मबन्धो॥", meaning:"A humble appeal to Swaminatha, compassionate friend and son of Parvati and Shiva." },
    { id:"skanda-prarthana", title:"Skanda Prarthana", text:"षण्मुखं पार्वतीपुत्रं कृत्तिकाप्रिय नन्दनम्।\nदेवसेनापतिं वन्दे स्कन्दं शक्तिधरं प्रभुम्॥", meaning:"A salutation to six-faced Skanda, commander of the divine hosts." }
  ],
  sriram: [
    { id:"rama-raksha", title:"Sri Rama Raksha – Opening", text:"चरितं रघुनाथस्य शतकोटिप्रविस्तरम्।\nएकैकमक्षरं पुंसां महापातकनाशनम्॥", meaning:"The sacred story of Raghunatha is praised as purifying and spiritually uplifting." },
    { id:"rama-dhyana", title:"Sri Rama Dhyana Slokam", text:"ध्यायेदाजानुबाहुं धृतशरधनुषं बद्धपद्मासनस्थम्।\nपीतं वासो वसानं नवकमलदलस्पर्धिनेत्रं प्रसन्नम्॥", meaning:"A meditation on Sri Rama, serene, radiant and holding his bow and arrows." }
  ],
  shiva: [
    { id:"lingashtakam", title:"Lingashtakam – First Verse", text:"ब्रह्ममुरारिसुरार्चितलिङ्गं निर्मलभासितशोभितलिङ्गम्।\nजन्मजदुःखविनाशकलिङ्गं तत्प्रणमामि सदाशिवलिङ्गम्॥", meaning:"A salutation to the pure Shiva Linga worshipped by the devas and remover of sorrow." },
    { id:"bilvashtakam", title:"Bilvashtakam – First Verse", text:"त्रिदलं त्रिगुणाकारं त्रिनेत्रं च त्रियायुधम्।\nत्रिजन्मपापसंहारं एकबिल्वं शिवार्पणम्॥", meaning:"Offering a bilva leaf to Shiva with devotion is praised as spiritually purifying." }
  ],
  ganesha: [
    { id:"vakratunda", title:"Vakratunda Mahakaya", text:"वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥", meaning:"A prayer to Ganesha to remove obstacles from all undertakings." },
    { id:"ganesha-pancharatna", title:"Ganesha Pancharatna – Opening", text:"मुदाकरात्तमोदकं सदा विमुक्तिसाधकम्।\nकलाधरावतंसकं विलासिलोकरक्षकम्॥", meaning:"A hymn praising Ganesha, the joyful giver of wisdom and liberation." }
  ],
  durga: [
    { id:"sarva-mangala", title:"Sarva Mangala Mangalye", text:"सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके।\nशरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते॥", meaning:"A salutation to the Divine Mother, source of auspiciousness and refuge." },
    { id:"ya-devi", title:"Ya Devi Sarvabhuteshu", text:"या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता।\nनमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥", meaning:"Repeated salutations to the Goddess present in all beings as divine power." }
  ],
  bhadrakali: [
    { id:"kali-prarthana", title:"Kali Prarthana", text:"जयन्ती मङ्गला काली भद्रकाली कपालिनी।\nदुर्गा क्षमा शिवा धात्री स्वाहा स्वधा नमोऽस्तुते॥", meaning:"A salutation to the many protective and compassionate forms of the Divine Mother." },
    { id:"devi-suktam", title:"Devi Namaskara", text:"नमस्ते शरण्ये शिवे सानुकम्पे।\nनमस्ते जगद्व्यापिके विश्वरूपे॥", meaning:"A prayer seeking the Mother's compassionate protection." }
  ],
  lakshmi: [
    { id:"mahalakshmi-ashtakam", title:"Mahalakshmi Ashtakam – Opening", text:"नमस्तेऽस्तु महामाये श्रीपीठे सुरपूजिते।\nशङ्खचक्रगदाहस्ते महालक्ष्मि नमोऽस्तुते॥", meaning:"A salutation to Mahalakshmi, revered by the devas and giver of prosperity." },
    { id:"lakshmi-prarthana", title:"Lakshmi Prarthana", text:"या देवी सर्वभूतेषु लक्ष्मीरूपेण संस्थिता।\nनमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥", meaning:"A salutation to the Goddess who is present in all beings as abundance and grace." }
  ],
  narasimha: [
    { id:"ugram-viram", title:"Ugram Viram Mahavishnum", text:"उग्रं वीरं महाविष्णुं ज्वलन्तं सर्वतोमुखम्।\nनृसिंहं भीषणं भद्रं मृत्युर्मृत्युं नमाम्यहम्॥", meaning:"A prayer to Lord Narasimha, the fearless protector who conquers fear and death." },
    { id:"narasimha-prarthana", title:"Narasimha Prarthana", text:"नमस्ते नरसिंहाय प्रह्लादाह्लाददायिने।\nहिरण्यकशिपोर्वक्षः शिलाटङ्कनखालये॥", meaning:"A salutation to the Lord who protected Prahlada and destroyed tyranny." }
  ],
  ayyappa: [
    { id:"swamiye", title:"Swamiye Sharanam Ayyappa", text:"स्वामिये शरणम् अय्यप्पा।\nलोकवीरं महापूज्यं सर्वरक्षाकरं विभुम्॥", meaning:"A devotional surrender to Lord Ayyappa, revered protector of all." },
    { id:"ayyappa-dhyana", title:"Ayyappa Dhyana Slokam", text:"भूतनाथ सदानन्द सर्वभूतदयापर।\nरक्ष रक्ष महाबाहो शास्त्रे तुभ्यं नमो नमः॥", meaning:"A prayer to Dharma Sastha, compassionate guardian of all beings." }
  ],
  subramanya: [
    { id:"subrahmanya-bhujangam", title:"Subrahmanya Bhujangam – Opening", text:"सदा बालरूपापि विघ्नाद्रिहन्त्री।\nमहादन्तिवक्त्रापि पञ्चास्यमान्या॥", meaning:"A devotional meditation on the youthful Lord Subrahmanya and divine grace." },
    { id:"skanda-shasti", title:"Skanda Prarthana", text:"गुहाय नमः। स्कन्दाय नमः। षण्मुखाय नमः।\nसुब्रह्मण्याय नमो नमः॥", meaning:"Names of Skanda invoked with reverence and devotion." }
  ],
  "sammakka-sarakka": [
    { id:"amma-namaskara", title:"Vanadevata Namaskaram", text:"जय जय मातः करुणामयि।\nजननीं शक्तिरूपां वन्दे नमो नमः॥", meaning:"A respectful prayer to the motherly divine power; local Sammakka–Sarakka traditions are honoured." },
    { id:"devi-sharanam", title:"Devi Sharanam", text:"मातृदेव्यै नमस्तुभ्यं रक्ष मां करुणामयि।\nलोकक्षेमाय शक्तिं देहि नमो नमः॥", meaning:"A prayer for protection, strength and the welfare of the community." }
  ],
  bathukamma: [
    { id:"gauri-prarthana", title:"Gauri Prarthana", text:"सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके।\nशरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते॥", meaning:"A prayer to Gauri, honoured during the Bathukamma floral festival." },
    { id:"uma-namaskara", title:"Uma Namaskara", text:"नमः शिवायै च शिवायै नमः।\nउमामहेश्वराभ्यां नमः॥", meaning:"A salutation to Uma and Shiva, invoking harmony and auspiciousness." }
  ],
  saraswathi: [
    { id:"saraswathi-namastubhyam", title:"Saraswati Namastubhyam", text:"सरस्वति नमस्तुभ्यं वरदे कामरूपिणि।\nविद्यारम्भं करिष्यामि सिद्धिर्भवतु मे सदा॥", meaning:"A prayer to Saraswati for clarity, learning and success in study." },
    { id:"ya-kundendu", title:"Ya Kundendu Tusharahara Dhavala", text:"या कुन्देन्दुतुषारहारधवला या शुभ्रवस्त्रावृता।\nया वीणावरदण्डमण्डितकरा या श्वेतपद्मासना॥", meaning:"A meditation on Saraswati, radiant and seated on a white lotus with the veena." }
  ],
  "shiva-parvathi": [
    { id:"uma-maheshwara", title:"Uma Maheshwara Stuti", text:"वन्दे शम्भुमुमापतिं सुरगुरुं वन्दे जगत्कारणम्।\nवन्दे पन्नगभूषणं मृगधरं वन्दे पशूनां पतिम्॥", meaning:"A salutation to Shiva, consort of Uma and compassionate Lord of all beings." },
    { id:"ardhanarishwara", title:"Ardhanarishwara Stotram – Opening", text:"चाम्पेयगौरार्धशरीरकायै कर्पूरगौरार्धशरीरकाय।\nधम्मिल्लकायै च जटाधराय नमः शिवायै च नमः शिवाय॥", meaning:"A hymn honouring the inseparable divine forms of Shiva and Parvati." }
  ],
  jagannath: [
    { id:"jagannathashtakam", title:"Jagannathashtakam – Opening", text:"कदाचित्कालिन्दीतटविपिनसङ्गीतकरवो।\nमुदाभीरीनारीवदनकमलास्वादमधुपः॥", meaning:"A devotional verse celebrating Lord Jagannath, beloved of devotees." },
    { id:"jagannath-prarthana", title:"Jagannath Prarthana", text:"नीलाचलनिवासाय नित्याय परमात्मने।\nबलभद्रसुभद्राभ्यां जगन्नाथाय ते नमः॥", meaning:"A salutation to Jagannath of Nilachala, together with Balabhadra and Subhadra." }
  ],
  peddamma: [
    { id:"amma-prarthana", title:"Amma Prarthana", text:"सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके।\nशरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते॥", meaning:"A prayer to the Divine Mother for auspiciousness and protection." },
    { id:"devi-namaskara", title:"Devi Namaskara", text:"या देवी सर्वभूतेषु मातृरूपेण संस्थिता।\nनमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥", meaning:"A salutation to the Mother Goddess present in all beings." }
  ],
  saibaba: [
    { id:"sai-prarthana", title:"Sai Baba Prarthana", text:"ॐ साईं राम।\nअनन्तकोटि ब्रह्माण्डनायक राजाधिराज योगिराज परब्रह्म श्रीसच्चिदानन्द सद्गुरु साईंनाथ महाराज की जय॥", meaning:"A devotional salutation to Sai Nath, the compassionate Satguru." },
    { id:"guru-stuti", title:"Guru Stuti", text:"गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।\nगुरुः साक्षात् परब्रह्म तस्मै श्रीगुरवे नमः॥", meaning:"A reverence to the Guru as the guide to divine knowledge." }
  ],
  varahi: [
    { id:"varahi-prarthana", title:"Varahi Prarthana", text:"ॐ वराह्यै नमः।\nजय वराहि देवि, भक्तानुग्रहकारिणि नमो नमः॥", meaning:"A simple salutation to Goddess Varahi; traditional recitation forms vary by lineage." },
    { id:"devi-sharanam-varahi", title:"Devi Sharanam", text:"सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके।\nशरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते॥", meaning:"A general Devi prayer seeking auspiciousness and refuge." }
  ],
  "bhu-varahi": [
    { id:"bhu-varahi-prarthana", title:"Bhu Varahi Prarthana", text:"ॐ भूदेव्यै वराह्यै नमः।\nधरणीधारिणि देवि नमस्तुभ्यं नमो नमः॥", meaning:"A reverent prayer to the divine power associated with the Earth; lineage-specific mantras should be received from a guru." },
    { id:"bhu-devi-stuti", title:"Bhu Devi Stuti", text:"समुद्रवसने देवि पर्वतस्तनमण्डले।\nविष्णुपत्नि नमस्तुभ्यं पादस्पर्शं क्षमस्व मे॥", meaning:"A prayer to Mother Earth, asking forgiveness before touching the ground." }
  ],
  vishnu: [
    { id:"vishnu-shantakaram", title:"Shantakaram Bhujagashayanam", text:"शान्ताकारं भुजगशयनं पद्मनाभं सुरेशम्।\nविश्वाधारं गगनसदृशं मेघवर्णं शुभाङ्गम्॥", meaning:"A meditation on Lord Vishnu, peaceful, all-supporting and compassionate." },
    { id:"vishnu-sahasranama-dhyana", title:"Vishnu Dhyana Slokam", text:"मेघश्यामं पीतकौशेयवासं श्रीवत्साङ्कं कौस्तुभोद्भासिताङ्गम्।\nपुण्योपेतं पुण्डरीकायताक्षं विष्णुं वन्दे सर्वलोकैकनाथम्॥", meaning:"A salutation to Vishnu, the Lord of all worlds, radiant like a rain cloud." }
  ]
};

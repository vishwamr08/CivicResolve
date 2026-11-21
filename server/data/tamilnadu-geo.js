// Tamil Nadu Municipal & Administrative Hierarchy
// Inspired by Mudhalvarin Mugavari / CM Helpline civic jurisdiction standards

const TAMIL_NADU_DISTRICTS = [
  {
    id: 'chennai',
    name: 'Chennai',
    name_ta: 'சென்னை',
    type: 'District',
    localBodies: [
      {
        id: 'gcc',
        name: 'Greater Chennai Corporation',
        name_ta: 'பெருநகர சென்னை மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'z1', name: 'Zone 1 - Thiruvottiyur', name_ta: 'மண்டலம் 1 - திருவொற்றியூர்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
          { id: 'z4', name: 'Zone 4 - Tondiarpet', name_ta: 'மண்டலம் 4 - தண்டையார்பேட்டை', wards: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48] },
          { id: 'z5', name: 'Zone 5 - Royapuram', name_ta: 'மண்டலம் 5 - இராயபுரம்', wards: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63] },
          { id: 'z6', name: 'Zone 6 - Thiru-Vi-Ka Nagar', name_ta: 'மண்டலம் 6 - திரு.வி.க. நகர்', wards: [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78] },
          { id: 'z8', name: 'Zone 8 - Anna Nagar', name_ta: 'மண்டலம் 8 - அண்ணா நகர்', wards: [94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108] },
          { id: 'z9', name: 'Zone 9 - Teynampet', name_ta: 'மண்டலம் 9 - தேனாம்பேட்டை', wards: [109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126] },
          { id: 'z10', name: 'Zone 10 - Kodambakkam', name_ta: 'மண்டலம் 10 - கோடம்பாக்கம்', wards: [127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142] },
          { id: 'z13', name: 'Zone 13 - Adyar', name_ta: 'மண்டலம் 13 - அடையாறு', wards: [170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182] }
        ]
      }
    ]
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    name_ta: 'கோயம்புத்தூர்',
    type: 'District',
    localBodies: [
      {
        id: 'ccmc',
        name: 'Coimbatore City Municipal Corporation',
        name_ta: 'கோயம்புத்தூர் மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'c_north', name: 'North Zone', name_ta: 'வடக்கு மண்டலம்', wards: [1, 2, 3, 4, 5, 16, 17, 18, 19, 20] },
          { id: 'c_south', name: 'South Zone', name_ta: 'தெற்கு மண்டலம்', wards: [85, 86, 87, 88, 89, 90, 91, 92, 93, 94] },
          { id: 'c_east', name: 'East Zone', name_ta: 'கிழக்கு மண்டலம்', wards: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59] },
          { id: 'c_west', name: 'West Zone', name_ta: 'மேற்கு மண்டலம்', wards: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
          { id: 'c_central', name: 'Central Zone', name_ta: 'மத்திய மண்டலம்', wards: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69] }
        ]
      },
      {
        id: 'pollachi',
        name: 'Pollachi Municipality',
        name_ta: 'பொள்ளாச்சி நகராட்சி',
        type: 'Municipality',
        zones: [
          { id: 'pol_1', name: 'Town Wards', name_ta: 'நகர வார்டுகள்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ]
      }
    ]
  },
  {
    id: 'madurai',
    name: 'Madurai',
    name_ta: 'மதுரை',
    type: 'District',
    localBodies: [
      {
        id: 'mcmc',
        name: 'Madurai Corporation',
        name_ta: 'மதுரை மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'm_north', name: 'North Zone (Thallakulam)', name_ta: 'வடக்கு மண்டலம் (தல்லாகுளம்)', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 'm_south', name: 'South Zone (Palanganatham)', name_ta: 'தெற்கு மண்டலம் (பழங்காநத்தம்)', wards: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
          { id: 'm_central', name: 'Central Zone (Periyar)', name_ta: 'மத்திய மண்டலம் (பெரியார்)', wards: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
        ]
      }
    ]
  },
  {
    id: 'tiruchirappalli',
    name: 'Tiruchirappalli',
    name_ta: 'திருச்சிராப்பள்ளி',
    type: 'District',
    localBodies: [
      {
        id: 'tcmc',
        name: 'Tiruchirappalli City Corporation',
        name_ta: 'திருச்சிராப்பள்ளி மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 't_srirangam', name: 'Srirangam Zone', name_ta: 'ஸ்ரீரங்கம் மண்டலம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 't_ponmalai', name: 'Ponmalai (Golden Rock) Zone', name_ta: 'பொன்மலை மண்டலம்', wards: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
          { id: 't_kottam', name: 'K.Abishekapuram Zone', name_ta: 'கே.அபிஷேகபுரம் மண்டலம்', wards: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44] }
        ]
      }
    ]
  },
  {
    id: 'salem',
    name: 'Salem',
    name_ta: 'சேலம்',
    type: 'District',
    localBodies: [
      {
        id: 'scmc',
        name: 'Salem Corporation',
        name_ta: 'சேலம் மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 's_suramangalam', name: 'Suramangalam Zone', name_ta: 'சூரமங்கலம் மண்டலம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 's_hasthampatty', name: 'Hasthampatty Zone', name_ta: 'அஸ்தம்பட்டி மண்டலம்', wards: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
          { id: 's_ammapet', name: 'Ammapet Zone', name_ta: 'அம்மாபேட்டை மண்டலம்', wards: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
        ]
      }
    ]
  },
  {
    id: 'tirunelveli',
    name: 'Tirunelveli',
    name_ta: 'திருநெல்வேலி',
    type: 'District',
    localBodies: [
      {
        id: 'tn_corp',
        name: 'Tirunelveli Municipal Corporation',
        name_ta: 'திருநெல்வேலி மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'tn_palai', name: 'Palayamkottai Zone', name_ta: 'பாளையங்கோட்டை மண்டலம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 'tn_town', name: 'Tirunelveli Town Zone', name_ta: 'திருநெல்வேலி டவுன் மண்டலம்', wards: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24] }
        ]
      }
    ]
  },
  {
    id: 'chengalpattu',
    name: 'Chengalpattu',
    name_ta: 'செங்கல்பட்டு',
    type: 'District',
    localBodies: [
      {
        id: 'tambaram_corp',
        name: 'Tambaram Municipal Corporation',
        name_ta: 'தாம்பரம் மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'tb_east', name: 'East Tambaram', name_ta: 'கிழக்கு தாம்பரம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 'tb_chromepet', name: 'Chromepet - Pallavaram', name_ta: 'குரோம்பேட்டை - பல்லாவரம்', wards: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24] }
        ]
      }
    ]
  },
  {
    id: 'tiruvallur',
    name: 'Thiruvallur',
    name_ta: 'திருவள்ளூர்',
    type: 'District',
    localBodies: [
      {
        id: 'avadi_corp',
        name: 'Avadi Municipal Corporation',
        name_ta: 'ஆவடி மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'av_main', name: 'Avadi Central', name_ta: 'ஆவடி மத்தி', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 'av_pattabiram', name: 'Pattabiram Zone', name_ta: 'பட்டாபிராம் மண்டலம்', wards: [15, 16, 17, 18, 19, 20] }
        ]
      }
    ]
  },
  {
    id: 'vellore',
    name: 'Vellore',
    name_ta: 'வேலூர்',
    type: 'District',
    localBodies: [
      {
        id: 'vellore_corp',
        name: 'Vellore Municipal Corporation',
        name_ta: 'வேலூர் மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'vl_fort', name: 'Fort & Central Zone', name_ta: 'கோட்டை & மத்திய மண்டலம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 'vl_katpadi', name: 'Katpadi Zone', name_ta: 'காட்பாடி மண்டலம்', wards: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] }
        ]
      }
    ]
  },
  {
    id: 'erode',
    name: 'Erode',
    name_ta: 'ஈரோடு',
    type: 'District',
    localBodies: [
      {
        id: 'erode_corp',
        name: 'Erode City Municipal Corporation',
        name_ta: 'ஈரோடு மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'er_surampatti', name: 'Surampatti Zone', name_ta: 'சூரம்பட்டி மண்டலம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { id: 'er_periyasemur', name: 'Periyasemur Zone', name_ta: 'பெரியசேமூர் மண்டலம்', wards: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29] }
        ]
      }
    ]
  },
  {
    id: 'thanjavur',
    name: 'Thanjavur',
    name_ta: 'தஞ்சாவூர்',
    type: 'District',
    localBodies: [
      {
        id: 'thanjavur_corp',
        name: 'Thanjavur Municipal Corporation',
        name_ta: 'தஞ்சாவூர் மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'tj_palace', name: 'Big Temple & Palace Zone', name_ta: 'பெரிய கோவில் மண்டலம்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ]
      }
    ]
  },
  {
    id: 'kanyakumari',
    name: 'Kanyakumari',
    name_ta: 'கன்னியாகுமரி',
    type: 'District',
    localBodies: [
      {
        id: 'nagercoil_corp',
        name: 'Nagercoil Municipal Corporation',
        name_ta: 'நாகர்கோவில் மாநகராட்சி',
        type: 'Municipal Corporation',
        zones: [
          { id: 'ng_main', name: 'Nagercoil Town', name_ta: 'நாகர்கோவில் டவுன்', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ]
      }
    ]
  }
];

const TN_CIVIC_DEPARTMENTS = [
  {
    id: 'highways',
    name: 'Roads & Highways Department (TN Highways / PWD)',
    name_ta: 'நெடுஞ்சாலைத்துறை மற்றும் பொதுப்பணித்துறை',
    categories: ['Road Damage', 'Public Infrastructure'],
    defaultSlaHours: 24
  },
  {
    id: 'sanitation',
    name: 'Municipal Solid Waste & Sanitation Board',
    name_ta: 'திடக்கழிவு மற்றும் சுகாதார மேலாண்மை வாரியம்',
    categories: ['Garbage and Sanitation'],
    defaultSlaHours: 24
  },
  {
    id: 'water_cmwssb',
    name: 'Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD',
    name_ta: 'சென்னை குடிநீர் வழங்கல் மற்றும் கழிவுநீரகற்று வாரியம் / TWAD',
    categories: ['Water Leakage'],
    defaultSlaHours: 12
  },
  {
    id: 'drainage',
    name: 'Stormwater Drainage & Flood Mitigation Division',
    name_ta: 'மழைநீர் வடிகால் மற்றும் வெள்ளத்தடுப்பு பிரிவு',
    categories: ['Drainage'],
    defaultSlaHours: 24
  },
  {
    id: 'electricity',
    name: 'Tamil Nadu Generation and Distribution Corporation (TANGEDCO)',
    name_ta: 'தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மான கழகம் (TANGEDCO)',
    categories: ['Electricity'],
    defaultSlaHours: 6
  },
  {
    id: 'streetlight',
    name: 'Urban Local Bodies Public Lighting Division',
    name_ta: 'நகர்ப்புற உள்ளாட்சி அமைப்புகள் பொது மின்விளக்கு பிரிவு',
    categories: ['Streetlight'],
    defaultSlaHours: 48
  },
  {
    id: 'public_safety',
    name: 'Public Safety & Traffic Infrastructure Wing',
    name_ta: 'பொது பாதுகாப்பு மற்றும் போக்குவரத்து உள்கட்டமைப்பு பிரிவு',
    categories: ['Public Safety', 'Other'],
    defaultSlaHours: 24
  }
];

const DEFAULT_SLA_POLICY = {
  'Critical': 6,    // 6 hours for life-safety emergencies (snapped live cables, massive water main rupture)
  'High': 24,       // 24 hours (potholes on main bus corridors, clogged hospital drains)
  'Medium': 48,     // 48 hours (streetlights, uncollected non-hazard garbage)
  'Low': 72         // 72 hours (minor cosmetic repairs, signage)
};

module.exports = {
  TAMIL_NADU_DISTRICTS,
  TN_CIVIC_DEPARTMENTS,
  DEFAULT_SLA_POLICY
};

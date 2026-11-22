// Tamil Nadu Municipal & Administrative Hierarchy Master Dataset
// Authoritative dataset covering all 38 Revenue Districts and 25 Municipal Corporations of Tamil Nadu.
// Source: Government of Tamil Nadu Municipal Administration and Water Supply (MAWS) Department & Commissionerate of Municipal Administration (CMA)
// Statutory Reference: Tamil Nadu Urban Local Bodies Act, 1998, Tamil Nadu Urban Local Bodies (Amendment) Act, 2024
// Tamil Nadu Government Gazette Extraordinary (August 2024 Notifications for Karaikudi, Namakkal, Pudukkottai, Tiruvannamalai)

const TAMIL_NADU_DISTRICTS = [
  {
    "id": "ariyalur",
    "name": "Ariyalur",
    "name_ta": "அரியலூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "ariyalur_muni",
        "name": "Ariyalur Municipality",
        "name_ta": "அரியலூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ariyalur_muni_general",
            "name": "Ariyalur Municipal Area",
            "name_ta": "அரியலூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "jayankondam_muni",
        "name": "Jayankondam Municipality",
        "name_ta": "ஜெயங்கொண்டம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "jayankondam_muni_general",
            "name": "Jayankondam Municipal Area",
            "name_ta": "ஜெயங்கொண்டம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "chengalpattu",
    "name": "Chengalpattu",
    "name_ta": "செங்கல்பட்டு",
    "type": "District",
    "localBodies": [
      {
        "id": "tambaram_corp",
        "name": "Tambaram Municipal Corporation",
        "name_ta": "தாம்பரம் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 32 of 2021 (Tambaram City Municipal Corporation Act)",
        "zones": [
          {
            "id": "tb_z1",
            "name": "Zone 1 - Pammal & Anakaputhur",
            "name_ta": "மண்டலம் 1 - பம்மல் & அனகாபுத்தூர்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15
            ]
          },
          {
            "id": "tb_z2",
            "name": "Zone 2 - Pallavaram",
            "name_ta": "மண்டலம் 2 - பல்லாவரம்",
            "is_verified_zone": true,
            "wards": [
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29
            ]
          },
          {
            "id": "tb_z3",
            "name": "Zone 3 - Sembakkam & Hasthinapuram",
            "name_ta": "மண்டலம் 3 - செம்பாக்கம் & அஸ்தினாபுரம்",
            "is_verified_zone": true,
            "wards": [
              30,
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42
            ]
          },
          {
            "id": "tb_z4",
            "name": "Zone 4 - Tambaram East & West",
            "name_ta": "மண்டலம் 4 - தாம்பரம் கிழக்கு & மேற்கு",
            "is_verified_zone": true,
            "wards": [
              43,
              44,
              45,
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56
            ]
          },
          {
            "id": "tb_z5",
            "name": "Zone 5 - Perungalathur & Peerkankaranai",
            "name_ta": "மண்டலம் 5 - பெருங்களத்தூர் & பீர்க்கன்கரணை",
            "is_verified_zone": true,
            "wards": [
              57,
              58,
              59,
              60,
              61,
              62,
              63,
              64,
              65,
              66,
              67,
              68,
              69,
              70
            ]
          }
        ]
      },
      {
        "id": "chengalpattu_muni",
        "name": "Chengalpattu Municipality",
        "name_ta": "செங்கல்பட்டு நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "chengalpattu_muni_general",
            "name": "Chengalpattu Municipal Area",
            "name_ta": "செங்கல்பட்டு நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "maraimalainagar_muni",
        "name": "Maraimalai Nagar Municipality",
        "name_ta": "மறைமலைநகர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "maraimalainagar_muni_general",
            "name": "Maraimalai Nagar Municipal Area",
            "name_ta": "மறைமலைநகர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "chennai",
    "name": "Chennai",
    "name_ta": "சென்னை",
    "type": "District",
    "localBodies": [
      {
        "id": "gcc",
        "name": "Greater Chennai Corporation",
        "name_ta": "பெருநகர சென்னை மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Chennai City Municipal Corporation Act, 1919 (Act IV of 1919)",
        "zones": [
          {
            "id": "z1",
            "name": "Zone 1 - Thiruvottiyur",
            "name_ta": "மண்டலம் 1 - திருவொற்றியூர்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14
            ]
          },
          {
            "id": "z2",
            "name": "Zone 2 - Manali",
            "name_ta": "மண்டலம் 2 - மணலி",
            "is_verified_zone": true,
            "wards": [
              15,
              16,
              17,
              18,
              19,
              20,
              21
            ]
          },
          {
            "id": "z3",
            "name": "Zone 3 - Madhavaram",
            "name_ta": "மண்டலம் 3 - மாதவரம்",
            "is_verified_zone": true,
            "wards": [
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33
            ]
          },
          {
            "id": "z4",
            "name": "Zone 4 - Tondiarpet",
            "name_ta": "மண்டலம் 4 - தண்டையார்பேட்டை",
            "is_verified_zone": true,
            "wards": [
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48
            ]
          },
          {
            "id": "z5",
            "name": "Zone 5 - Royapuram",
            "name_ta": "மண்டலம் 5 - இராயபுரம்",
            "is_verified_zone": true,
            "wards": [
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60,
              61,
              62,
              63
            ]
          },
          {
            "id": "z6",
            "name": "Zone 6 - Thiru-Vi-Ka Nagar",
            "name_ta": "மண்டலம் 6 - திரு.வி.க. நகர்",
            "is_verified_zone": true,
            "wards": [
              64,
              65,
              66,
              67,
              68,
              69,
              70,
              71,
              72,
              73,
              74,
              75,
              76,
              77,
              78
            ]
          },
          {
            "id": "z7",
            "name": "Zone 7 - Ambattur",
            "name_ta": "மண்டலம் 7 - அம்பத்தூர்",
            "is_verified_zone": true,
            "wards": [
              79,
              80,
              81,
              82,
              83,
              84,
              85,
              86,
              87,
              88,
              89,
              90,
              91,
              92,
              93
            ]
          },
          {
            "id": "z8",
            "name": "Zone 8 - Anna Nagar",
            "name_ta": "மண்டலம் 8 - அண்ணா நகர்",
            "is_verified_zone": true,
            "wards": [
              94,
              95,
              96,
              97,
              98,
              99,
              100,
              101,
              102,
              103,
              104,
              105,
              106,
              107,
              108
            ]
          },
          {
            "id": "z9",
            "name": "Zone 9 - Teynampet",
            "name_ta": "மண்டலம் 9 - தேனாம்பேட்டை",
            "is_verified_zone": true,
            "wards": [
              109,
              110,
              111,
              112,
              113,
              114,
              115,
              116,
              117,
              118,
              119,
              120,
              121,
              122,
              123,
              124,
              125,
              126
            ]
          },
          {
            "id": "z10",
            "name": "Zone 10 - Kodambakkam",
            "name_ta": "மண்டலம் 10 - கோடம்பாக்கம்",
            "is_verified_zone": true,
            "wards": [
              127,
              128,
              129,
              130,
              131,
              132,
              133,
              134,
              135,
              136,
              137,
              138,
              139,
              140,
              141,
              142
            ]
          },
          {
            "id": "z11",
            "name": "Zone 11 - Valasaravakkam",
            "name_ta": "மண்டலம் 11 - வளசரவாக்கம்",
            "is_verified_zone": true,
            "wards": [
              143,
              144,
              145,
              146,
              147,
              148,
              149,
              150,
              151,
              152,
              153,
              154,
              155
            ]
          },
          {
            "id": "z12",
            "name": "Zone 12 - Alandur",
            "name_ta": "மண்டலம் 12 - ஆலந்தூர்",
            "is_verified_zone": true,
            "wards": [
              156,
              157,
              158,
              159,
              160,
              161,
              162,
              163,
              164,
              165,
              166,
              167
            ]
          },
          {
            "id": "z13",
            "name": "Zone 13 - Adyar",
            "name_ta": "மண்டலம் 13 - அடையாறு",
            "is_verified_zone": true,
            "wards": [
              170,
              171,
              172,
              173,
              174,
              175,
              176,
              177,
              178,
              179,
              180,
              181,
              182
            ]
          },
          {
            "id": "z14",
            "name": "Zone 14 - Perungudi",
            "name_ta": "மண்டலம் 14 - பெருங்குடி",
            "is_verified_zone": true,
            "wards": [
              168,
              169,
              183,
              184,
              185,
              186,
              187,
              188,
              189,
              190,
              191
            ]
          },
          {
            "id": "z15",
            "name": "Zone 15 - Sholinganallur",
            "name_ta": "மண்டலம் 15 - சோழிங்கநல்லூர்",
            "is_verified_zone": true,
            "wards": [
              192,
              193,
              194,
              195,
              196,
              197,
              198,
              199,
              200
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "coimbatore",
    "name": "Coimbatore",
    "name_ta": "கோயம்புத்தூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "ccmc",
        "name": "Coimbatore City Municipal Corporation",
        "name_ta": "கோயம்புத்தூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Coimbatore City Municipal Corporation Act, 1981 (Act 25 of 1981)",
        "zones": [
          {
            "id": "c_north",
            "name": "North Zone",
            "name_ta": "வடக்கு மண்டலம்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              16,
              17,
              18,
              19,
              20
            ]
          },
          {
            "id": "c_south",
            "name": "South Zone",
            "name_ta": "தெற்கு மண்டலம்",
            "is_verified_zone": true,
            "wards": [
              85,
              86,
              87,
              88,
              89,
              90,
              91,
              92,
              93,
              94
            ]
          },
          {
            "id": "c_east",
            "name": "East Zone",
            "name_ta": "கிழக்கு மண்டலம்",
            "is_verified_zone": true,
            "wards": [
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59
            ]
          },
          {
            "id": "c_west",
            "name": "West Zone",
            "name_ta": "மேற்கு மண்டலம்",
            "is_verified_zone": true,
            "wards": [
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30
            ]
          },
          {
            "id": "c_central",
            "name": "Central Zone",
            "name_ta": "மத்திய மண்டலம்",
            "is_verified_zone": true,
            "wards": [
              60,
              61,
              62,
              63,
              64,
              65,
              66,
              67,
              68,
              69
            ]
          }
        ]
      },
      {
        "id": "pollachi_muni",
        "name": "Pollachi Municipality",
        "name_ta": "பொள்ளாச்சி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "pollachi_muni_general",
            "name": "Pollachi Municipal Area",
            "name_ta": "பொள்ளாச்சி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "mettupalayam_muni",
        "name": "Mettupalayam Municipality",
        "name_ta": "மேட்டுப்பாளையம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "mettupalayam_muni_general",
            "name": "Mettupalayam Municipal Area",
            "name_ta": "மேட்டுப்பாளையம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "cuddalore",
    "name": "Cuddalore",
    "name_ta": "கடலூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "cuddalore_corp",
        "name": "Cuddalore Municipal Corporation",
        "name_ta": "கடலூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 30 of 2021 (Cuddalore City Municipal Corporation Act)",
        "zones": [
          {
            "id": "cuddalore_corp_general",
            "name": "Cuddalore Corporation Area",
            "name_ta": "கடலூர் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      },
      {
        "id": "chidambaram_muni",
        "name": "Chidambaram Municipality",
        "name_ta": "சிதம்பரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "chidambaram_muni_general",
            "name": "Chidambaram Municipal Area",
            "name_ta": "சிதம்பரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "panruti_muni",
        "name": "Panruti Municipality",
        "name_ta": "பண்ருட்டி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "panruti_muni_general",
            "name": "Panruti Municipal Area",
            "name_ta": "பண்ருட்டி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "dharmapuri",
    "name": "Dharmapuri",
    "name_ta": "தருமபுரி",
    "type": "District",
    "localBodies": [
      {
        "id": "dharmapuri_muni",
        "name": "Dharmapuri Municipality",
        "name_ta": "தருமபுரி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "dharmapuri_muni_general",
            "name": "Dharmapuri Municipal Area",
            "name_ta": "தருமபுரி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "dindigul",
    "name": "Dindigul",
    "name_ta": "திண்டுக்கல்",
    "type": "District",
    "localBodies": [
      {
        "id": "dindigul_corp",
        "name": "Dindigul City Municipal Corporation",
        "name_ta": "திண்டுக்கல் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 25 of 2013 (Dindigul City Municipal Corporation Act)",
        "zones": [
          {
            "id": "dg_z1",
            "name": "Zone 1 - North Dindigul",
            "name_ta": "மண்டலம் 1 - வடக்கு திண்டுக்கல்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12
            ]
          },
          {
            "id": "dg_z2",
            "name": "Zone 2 - South Dindigul",
            "name_ta": "மண்டலம் 2 - தெற்கு திண்டுக்கல்",
            "is_verified_zone": true,
            "wards": [
              13,
              14,
              15,
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24
            ]
          },
          {
            "id": "dg_z3",
            "name": "Zone 3 - East Dindigul",
            "name_ta": "மண்டலம் 3 - கிழக்கு திண்டுக்கல்",
            "is_verified_zone": true,
            "wards": [
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34,
              35,
              36
            ]
          },
          {
            "id": "dg_z4",
            "name": "Zone 4 - West Dindigul",
            "name_ta": "மண்டலம் 4 - மேற்கு திண்டுக்கல்",
            "is_verified_zone": true,
            "wards": [
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48
            ]
          }
        ]
      },
      {
        "id": "palani_muni",
        "name": "Palani Municipality",
        "name_ta": "பழனி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "palani_muni_general",
            "name": "Palani Municipal Area",
            "name_ta": "பழனி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "kodaikanal_muni",
        "name": "Kodaikanal Municipality",
        "name_ta": "கொடைக்கானல் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "kodaikanal_muni_general",
            "name": "Kodaikanal Municipal Area",
            "name_ta": "கொடைக்கானல் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "erode",
    "name": "Erode",
    "name_ta": "ஈரோடு",
    "type": "District",
    "localBodies": [
      {
        "id": "erode_corp",
        "name": "Erode City Municipal Corporation",
        "name_ta": "ஈரோடு மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 8 of 2008 (Erode City Municipal Corporation Act)",
        "zones": [
          {
            "id": "er_surampatti",
            "name": "Zone 1 - Surampatti",
            "name_ta": "மண்டலம் 1 - சூரம்பட்டி",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15
            ]
          },
          {
            "id": "er_periyasemur",
            "name": "Zone 2 - Periyasemur",
            "name_ta": "மண்டலம் 2 - பெரியசேமூர்",
            "is_verified_zone": true,
            "wards": [
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30
            ]
          },
          {
            "id": "er_veerappanchatram",
            "name": "Zone 3 - Veerappanchatram",
            "name_ta": "மண்டலம் 3 - வீரப்பஞ்சத்திரம்",
            "is_verified_zone": true,
            "wards": [
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45
            ]
          },
          {
            "id": "er_kasipalayam",
            "name": "Zone 4 - Kasipalayam",
            "name_ta": "மண்டலம் 4 - காசிபாளையம்",
            "is_verified_zone": true,
            "wards": [
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60
            ]
          }
        ]
      },
      {
        "id": "gobichettipalayam_muni",
        "name": "Gobichettipalayam Municipality",
        "name_ta": "கோபிசெட்டிபாளையம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "gobichettipalayam_muni_general",
            "name": "Gobichettipalayam Municipal Area",
            "name_ta": "கோபிசெட்டிபாளையம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "bhavani_muni",
        "name": "Bhavani Municipality",
        "name_ta": "பவானி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "bhavani_muni_general",
            "name": "Bhavani Municipal Area",
            "name_ta": "பவானி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "kallakurichi",
    "name": "Kallakurichi",
    "name_ta": "கள்ளக்குறிச்சி",
    "type": "District",
    "localBodies": [
      {
        "id": "kallakurichi_muni",
        "name": "Kallakurichi Municipality",
        "name_ta": "கள்ளக்குறிச்சி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "kallakurichi_muni_general",
            "name": "Kallakurichi Municipal Area",
            "name_ta": "கள்ளக்குறிச்சி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "ulundurpet_muni",
        "name": "Ulundurpet Municipality",
        "name_ta": "உளுந்தூர்பேட்டை நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ulundurpet_muni_general",
            "name": "Ulundurpet Municipal Area",
            "name_ta": "உளுந்தூர்பேட்டை நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "kancheepuram",
    "name": "Kancheepuram",
    "name_ta": "காஞ்சிபுரம்",
    "type": "District",
    "localBodies": [
      {
        "id": "kancheepuram_corp",
        "name": "Kancheepuram Municipal Corporation",
        "name_ta": "காஞ்சிபுரம் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 31 of 2021 (Kancheepuram City Municipal Corporation Act)",
        "zones": [
          {
            "id": "kancheepuram_corp_general",
            "name": "Kancheepuram Corporation Area",
            "name_ta": "காஞ்சிபுரம் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      }
    ]
  },
  {
    "id": "kanniyakumari",
    "name": "Kanniyakumari",
    "name_ta": "கன்னியாகுமரி",
    "type": "District",
    "localBodies": [
      {
        "id": "nagercoil_corp",
        "name": "Nagercoil Municipal Corporation",
        "name_ta": "நாகர்கோவில் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 10 of 2019 (Nagercoil City Municipal Corporation Act)",
        "zones": [
          {
            "id": "nagercoil_corp_general",
            "name": "Nagercoil Corporation Area",
            "name_ta": "நாகர்கோவில் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      },
      {
        "id": "colachel_muni",
        "name": "Colachel Municipality",
        "name_ta": "குளச்சல் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "colachel_muni_general",
            "name": "Colachel Municipal Area",
            "name_ta": "குளச்சல் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "padmanabhapuram_muni",
        "name": "Padmanabhapuram Municipality",
        "name_ta": "பத்மநாபபுரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "padmanabhapuram_muni_general",
            "name": "Padmanabhapuram Municipal Area",
            "name_ta": "பத்மநாபபுரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "karur",
    "name": "Karur",
    "name_ta": "கரூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "karur_corp",
        "name": "Karur Municipal Corporation",
        "name_ta": "கரூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 33 of 2021 (Karur City Municipal Corporation Act)",
        "zones": [
          {
            "id": "karur_corp_general",
            "name": "Karur Corporation Area",
            "name_ta": "கரூர் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      },
      {
        "id": "kulithalai_muni",
        "name": "Kulithalai Municipality",
        "name_ta": "குளித்தலை நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "kulithalai_muni_general",
            "name": "Kulithalai Municipal Area",
            "name_ta": "குளித்தலை நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "krishnagiri",
    "name": "Krishnagiri",
    "name_ta": "கிருஷ்ணகிரி",
    "type": "District",
    "localBodies": [
      {
        "id": "hosur_corp",
        "name": "Hosur City Municipal Corporation",
        "name_ta": "ஓசூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 9 of 2019 (Hosur City Municipal Corporation Act)",
        "zones": [
          {
            "id": "hosur_corp_general",
            "name": "Hosur City Corporation Area",
            "name_ta": "ஓசூர் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      },
      {
        "id": "krishnagiri_muni",
        "name": "Krishnagiri Municipality",
        "name_ta": "கிருஷ்ணகிரி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "krishnagiri_muni_general",
            "name": "Krishnagiri Municipal Area",
            "name_ta": "கிருஷ்ணகிரி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "madurai",
    "name": "Madurai",
    "name_ta": "மதுரை",
    "type": "District",
    "localBodies": [
      {
        "id": "mcmc",
        "name": "Madurai Corporation",
        "name_ta": "மதுரை மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Madurai City Municipal Corporation Act, 1971 (Act 15 of 1971)",
        "zones": [
          {
            "id": "m_north",
            "name": "Zone 1 - North (Thallakulam)",
            "name_ta": "மண்டலம் 1 - வடக்கு (தல்லாகுளம்)",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15,
              16,
              17,
              18,
              19,
              20
            ]
          },
          {
            "id": "m_south",
            "name": "Zone 2 - South (Palanganatham)",
            "name_ta": "மண்டலம் 2 - தெற்கு (பழங்காநத்தம்)",
            "is_verified_zone": true,
            "wards": [
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40
            ]
          },
          {
            "id": "m_central",
            "name": "Zone 3 - Central (Periyar)",
            "name_ta": "மண்டலம் 3 - மத்திய (பெரியார்)",
            "is_verified_zone": true,
            "wards": [
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60
            ]
          },
          {
            "id": "m_east",
            "name": "Zone 4 - East (K.K. Nagar)",
            "name_ta": "மண்டலம் 4 - கிழக்கு (கே.கே. நகர்)",
            "is_verified_zone": true,
            "wards": [
              61,
              62,
              63,
              64,
              65,
              66,
              67,
              68,
              69,
              70,
              71,
              72,
              73,
              74,
              75,
              76,
              77,
              78,
              79,
              80
            ]
          },
          {
            "id": "m_west",
            "name": "Zone 5 - West (Fatima College)",
            "name_ta": "மண்டலம் 5 - மேற்கு (பாத்திமா கல்லூரி)",
            "is_verified_zone": true,
            "wards": [
              81,
              82,
              83,
              84,
              85,
              86,
              87,
              88,
              89,
              90,
              91,
              92,
              93,
              94,
              95,
              96,
              97,
              98,
              99,
              100
            ]
          }
        ]
      },
      {
        "id": "melur_muni",
        "name": "Melur Municipality",
        "name_ta": "மேலூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "melur_muni_general",
            "name": "Melur Municipal Area",
            "name_ta": "மேலூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "thirumangalam_muni",
        "name": "Thirumangalam Municipality",
        "name_ta": "திருமங்கலம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "thirumangalam_muni_general",
            "name": "Thirumangalam Municipal Area",
            "name_ta": "திருமங்கலம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "mayiladuthurai",
    "name": "Mayiladuthurai",
    "name_ta": "மயிலாடுதுறை",
    "type": "District",
    "localBodies": [
      {
        "id": "mayiladuthurai_muni",
        "name": "Mayiladuthurai Municipality",
        "name_ta": "மயிலாடுதுறை நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "mayiladuthurai_muni_general",
            "name": "Mayiladuthurai Municipal Area",
            "name_ta": "மயிலாடுதுறை நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "sirkazhi_muni",
        "name": "Sirkazhi Municipality",
        "name_ta": "சீர்காழி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "sirkazhi_muni_general",
            "name": "Sirkazhi Municipal Area",
            "name_ta": "சீர்காழி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "nagapattinam",
    "name": "Nagapattinam",
    "name_ta": "நாகப்பட்டினம்",
    "type": "District",
    "localBodies": [
      {
        "id": "nagapattinam_muni",
        "name": "Nagapattinam Municipality",
        "name_ta": "நாகப்பட்டினம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "nagapattinam_muni_general",
            "name": "Nagapattinam Municipal Area",
            "name_ta": "நாகப்பட்டினம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "vedaranyam_muni",
        "name": "Vedaranyam Municipality",
        "name_ta": "வேதாரண்யம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "vedaranyam_muni_general",
            "name": "Vedaranyam Municipal Area",
            "name_ta": "வேதாரண்யம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "namakkal",
    "name": "Namakkal",
    "name_ta": "நாமக்கல்",
    "type": "District",
    "localBodies": [
      {
        "id": "namakkal_corp",
        "name": "Namakkal Municipal Corporation",
        "name_ta": "நாமக்கல் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Urban Local Bodies (Amendment) Act, 2024 / MAWS G.O. (Upgraded August 2024)",
        "constituent_units": {
          "core_municipality": "Namakkal Municipality",
          "town_panchayats": [],
          "village_panchayats": [
            "Vasanthapuram",
            "Vagurampatti",
            "Vallipuram",
            "Redipatti",
            "Veesanam",
            "Marurpatti",
            "Pappinayakkanpatti",
            "Siluvampatty",
            "Thottipatti",
            "Vettampatti",
            "Laddivadi",
            "Kadappalli"
          ]
        },
        "zones": [
          {
            "id": "nmk_corp_general",
            "name": "Namakkal Corporation Area",
            "name_ta": "நாமக்கல் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Official corporate zone and ward delimitation notification pending publication by the Delimitation Commission"
          }
        ]
      },
      {
        "id": "tiruchengode_muni",
        "name": "Tiruchengode Municipality",
        "name_ta": "திருச்செங்கோடு நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "tiruchengode_muni_general",
            "name": "Tiruchengode Municipal Area",
            "name_ta": "திருச்செங்கோடு நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "nilgiris",
    "name": "Nilgiris",
    "name_ta": "நீலகிரி",
    "type": "District",
    "localBodies": [
      {
        "id": "ooty_muni",
        "name": "Udhagamandalam (Ooty) Municipality",
        "name_ta": "உதகமண்டலம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ooty_muni_general",
            "name": "Udhagamandalam (Ooty) Municipal Area",
            "name_ta": "உதகமண்டலம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "coonoor_muni",
        "name": "Coonoor Municipality",
        "name_ta": "குன்னூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "coonoor_muni_general",
            "name": "Coonoor Municipal Area",
            "name_ta": "குன்னூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "perambalur",
    "name": "Perambalur",
    "name_ta": "பெரம்பலூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "perambalur_muni",
        "name": "Perambalur Municipality",
        "name_ta": "பெரம்பலூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "perambalur_muni_general",
            "name": "Perambalur Municipal Area",
            "name_ta": "பெரம்பலூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "pudukkottai",
    "name": "Pudukkottai",
    "name_ta": "புதுக்கோட்டை",
    "type": "District",
    "localBodies": [
      {
        "id": "pudukkottai_corp",
        "name": "Pudukkottai Municipal Corporation",
        "name_ta": "புதுக்கோட்டை மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Urban Local Bodies (Amendment) Act, 2024 / MAWS G.O. (Upgraded August 2024)",
        "constituent_units": {
          "core_municipality": "Pudukkottai Municipality",
          "town_panchayats": [],
          "village_panchayats": [
            "Vagavasal",
            "Mullur",
            "Thirukkattalai",
            "Thirumalairayasamuthiram",
            "Kavinadu Kizhakku",
            "Kavinadu Merku",
            "9-A Natham Pannai",
            "9-B Natham Pannai",
            "Thekkattur (Wards 1, 2, 3)",
            "Thiruvengaivasal (Wards 3, 4)",
            "Vellanur (Wards 7, 8, 9)"
          ]
        },
        "zones": [
          {
            "id": "pdk_corp_general",
            "name": "Pudukkottai Corporation Area",
            "name_ta": "புதுக்கோட்டை மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Official corporate zone and ward delimitation notification pending publication by the Delimitation Commission"
          }
        ]
      },
      {
        "id": "aranthangi_muni",
        "name": "Aranthangi Municipality",
        "name_ta": "அறந்தாங்கி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "aranthangi_muni_general",
            "name": "Aranthangi Municipal Area",
            "name_ta": "அறந்தாங்கி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "ramanathapuram",
    "name": "Ramanathapuram",
    "name_ta": "இராமநாதபுரம்",
    "type": "District",
    "localBodies": [
      {
        "id": "ramanathapuram_muni",
        "name": "Ramanathapuram Municipality",
        "name_ta": "இராமநாதபுரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ramanathapuram_muni_general",
            "name": "Ramanathapuram Municipal Area",
            "name_ta": "இராமநாதபுரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "rameswaram_muni",
        "name": "Rameswaram Municipality",
        "name_ta": "ராமேஸ்வரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "rameswaram_muni_general",
            "name": "Rameswaram Municipal Area",
            "name_ta": "ராமேஸ்வரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "ranipet",
    "name": "Ranipet",
    "name_ta": "இராணிப்பேட்டை",
    "type": "District",
    "localBodies": [
      {
        "id": "ranipet_muni",
        "name": "Ranipet Municipality",
        "name_ta": "இராணிப்பேட்டை நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ranipet_muni_general",
            "name": "Ranipet Municipal Area",
            "name_ta": "இராணிப்பேட்டை நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "arakkonam_muni",
        "name": "Arakkonam Municipality",
        "name_ta": "அரக்கோணம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "arakkonam_muni_general",
            "name": "Arakkonam Municipal Area",
            "name_ta": "அரக்கோணம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "salem",
    "name": "Salem",
    "name_ta": "சேலம்",
    "type": "District",
    "localBodies": [
      {
        "id": "scmc",
        "name": "Salem Corporation",
        "name_ta": "சேலம் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Salem City Municipal Corporation Act, 1994 (Act 29 of 1994)",
        "zones": [
          {
            "id": "s_suramangalam",
            "name": "Zone 1 - Suramangalam",
            "name_ta": "மண்டலம் 1 - சூரமங்கலம்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15
            ]
          },
          {
            "id": "s_hasthampatty",
            "name": "Zone 2 - Hasthampatty",
            "name_ta": "மண்டலம் 2 - அஸ்தம்பட்டி",
            "is_verified_zone": true,
            "wards": [
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30
            ]
          },
          {
            "id": "s_ammapet",
            "name": "Zone 3 - Ammapet",
            "name_ta": "மண்டலம் 3 - அம்மாபேட்டை",
            "is_verified_zone": true,
            "wards": [
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45
            ]
          },
          {
            "id": "s_kondalampatty",
            "name": "Zone 4 - Kondalampatty",
            "name_ta": "மண்டலம் 4 - கொண்டலாம்பட்டி",
            "is_verified_zone": true,
            "wards": [
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60
            ]
          }
        ]
      },
      {
        "id": "attur_muni",
        "name": "Attur Municipality",
        "name_ta": "ஆத்தூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "attur_muni_general",
            "name": "Attur Municipal Area",
            "name_ta": "ஆத்தூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "sivaganga",
    "name": "Sivaganga",
    "name_ta": "சிவகங்கை",
    "type": "District",
    "localBodies": [
      {
        "id": "sivaganga_muni",
        "name": "Sivaganga Municipality",
        "name_ta": "சிவகங்கை நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "sivaganga_muni_general",
            "name": "Sivaganga Municipal Area",
            "name_ta": "சிவகங்கை நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "karaikudi_corp",
        "name": "Karaikudi Municipal Corporation",
        "name_ta": "காரைக்குடி மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Urban Local Bodies (Amendment) Act, 2024 / MAWS G.O. (Upgraded August 2024)",
        "constituent_units": {
          "core_municipality": "Karaikudi Municipality (Special Grade)",
          "town_panchayats": [
            "Kandanur Town Panchayat",
            "Kottaiyur Town Panchayat"
          ],
          "village_panchayats": [
            "Sankarapuram",
            "Koviloor",
            "Ariyakudi",
            "Iluppakudi",
            "Managiri"
          ]
        },
        "zones": [
          {
            "id": "kkdi_corp_general",
            "name": "Karaikudi Corporation Area",
            "name_ta": "காரைக்குடி மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Official corporate zone and ward delimitation notification pending publication by the Delimitation Commission"
          }
        ]
      }
    ]
  },
  {
    "id": "tenkasi",
    "name": "Tenkasi",
    "name_ta": "தென்காசி",
    "type": "District",
    "localBodies": [
      {
        "id": "tenkasi_muni",
        "name": "Tenkasi Municipality",
        "name_ta": "தென்காசி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "tenkasi_muni_general",
            "name": "Tenkasi Municipal Area",
            "name_ta": "தென்காசி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "sankarankovil_muni",
        "name": "Sankarankovil Municipality",
        "name_ta": "சங்கரன்கோவில் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "sankarankovil_muni_general",
            "name": "Sankarankovil Municipal Area",
            "name_ta": "சங்கரன்கோவில் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "thanjavur",
    "name": "Thanjavur",
    "name_ta": "தஞ்சாவூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "thanjavur_corp",
        "name": "Thanjavur Municipal Corporation",
        "name_ta": "தஞ்சாவூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 24 of 2013 (Thanjavur City Municipal Corporation Act)",
        "zones": [
          {
            "id": "tj_palace",
            "name": "Zone 1 - Big Temple & Palace",
            "name_ta": "மண்டலம் 1 - பெரிய கோவில் & அரண்மனை",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15,
              16,
              17
            ]
          },
          {
            "id": "tj_medical",
            "name": "Zone 2 - Medical College & New Town",
            "name_ta": "மண்டலம் 2 - மருத்துவக் கல்லூரி பகுதி",
            "is_verified_zone": true,
            "wards": [
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34
            ]
          },
          {
            "id": "tj_karunthattankudi",
            "name": "Zone 3 - Karunthattankudi & North",
            "name_ta": "மண்டலம் 3 - கரந்தட்டான்குடி & வடக்கு",
            "is_verified_zone": true,
            "wards": [
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48,
              49,
              50,
              51
            ]
          }
        ]
      },
      {
        "id": "kumbakonam_corp",
        "name": "Kumbakonam Municipal Corporation",
        "name_ta": "கும்பகோணம் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 34 of 2021 (Kumbakonam City Municipal Corporation Act)",
        "zones": [
          {
            "id": "kumbakonam_corp_general",
            "name": "Kumbakonam Corporation Area",
            "name_ta": "கும்பகோணம் மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      }
    ]
  },
  {
    "id": "theni",
    "name": "Theni",
    "name_ta": "தேனி",
    "type": "District",
    "localBodies": [
      {
        "id": "theni_muni",
        "name": "Theni Allinagaram Municipality",
        "name_ta": "தேனி அல்லிநகரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "theni_muni_general",
            "name": "Theni Allinagaram Municipal Area",
            "name_ta": "தேனி அல்லிநகரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "bodinayakanur_muni",
        "name": "Bodinayakanur Municipality",
        "name_ta": "போடிநாயக்கனூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "bodinayakanur_muni_general",
            "name": "Bodinayakanur Municipal Area",
            "name_ta": "போடிநாயக்கனூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "thoothukudi",
    "name": "Thoothukudi",
    "name_ta": "தூத்துக்குடி",
    "type": "District",
    "localBodies": [
      {
        "id": "thoothukudi_corp",
        "name": "Thoothukudi City Municipal Corporation",
        "name_ta": "தூத்துக்குடி மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 27 of 2008 (Thoothukudi City Municipal Corporation Act)",
        "zones": [
          {
            "id": "ttk_z1",
            "name": "Zone 1 - North Port Zone",
            "name_ta": "மண்டலம் 1 - வடக்கு துறைமுக மண்டலம்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15
            ]
          },
          {
            "id": "ttk_z2",
            "name": "Zone 2 - Central Pearl City",
            "name_ta": "மண்டலம் 2 - மத்திய முத்துநகர்",
            "is_verified_zone": true,
            "wards": [
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30
            ]
          },
          {
            "id": "ttk_z3",
            "name": "Zone 3 - South Saltpan & Industrial",
            "name_ta": "மண்டலம் 3 - தெற்கு உப்பள பகுதி",
            "is_verified_zone": true,
            "wards": [
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45
            ]
          },
          {
            "id": "ttk_z4",
            "name": "Zone 4 - West Town Zone",
            "name_ta": "மண்டலம் 4 - மேற்கு டவுன் பகுதி",
            "is_verified_zone": true,
            "wards": [
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60
            ]
          }
        ]
      },
      {
        "id": "kovilpatti_muni",
        "name": "Kovilpatti Municipality",
        "name_ta": "கோவில்பட்டி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "kovilpatti_muni_general",
            "name": "Kovilpatti Municipal Area",
            "name_ta": "கோவில்பட்டி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tiruchirappalli",
    "name": "Tiruchirappalli",
    "name_ta": "திருச்சிராப்பள்ளி",
    "type": "District",
    "localBodies": [
      {
        "id": "tcmc",
        "name": "Tiruchirappalli City Corporation",
        "name_ta": "திருச்சிராப்பள்ளி மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tiruchirappalli City Municipal Corporation Act, 1994 (Act 27 of 1994)",
        "zones": [
          {
            "id": "t_srirangam",
            "name": "Zone 1 - Srirangam",
            "name_ta": "மண்டலம் 1 - ஸ்ரீரங்கம்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13
            ]
          },
          {
            "id": "t_ariyamangalam",
            "name": "Zone 2 - Ariyamangalam",
            "name_ta": "மண்டலம் 2 - அரியமங்கலம்",
            "is_verified_zone": true,
            "wards": [
              14,
              15,
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26
            ]
          },
          {
            "id": "t_ponmalai",
            "name": "Zone 3 - Ponmalai (Golden Rock)",
            "name_ta": "மண்டலம் 3 - பொன்மலை",
            "is_verified_zone": true,
            "wards": [
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39
            ]
          },
          {
            "id": "t_kottam",
            "name": "Zone 4 - K.Abishekapuram",
            "name_ta": "மண்டலம் 4 - கே.அபிஷேகபுரம்",
            "is_verified_zone": true,
            "wards": [
              40,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48,
              49,
              50,
              51,
              52
            ]
          },
          {
            "id": "t_thiruverumbur",
            "name": "Zone 5 - Thiruverumbur",
            "name_ta": "மண்டலம் 5 - திருவெறும்பூர்",
            "is_verified_zone": true,
            "wards": [
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60,
              61,
              62,
              63,
              64,
              65
            ]
          }
        ]
      },
      {
        "id": "manapparai_muni",
        "name": "Manapparai Municipality",
        "name_ta": "மணப்பாறை நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "manapparai_muni_general",
            "name": "Manapparai Municipal Area",
            "name_ta": "மணப்பாறை நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tirunelveli",
    "name": "Tirunelveli",
    "name_ta": "திருநெல்வேலி",
    "type": "District",
    "localBodies": [
      {
        "id": "tn_corp",
        "name": "Tirunelveli Municipal Corporation",
        "name_ta": "திருநெல்வேலி மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tirunelveli City Municipal Corporation Act, 1994 (Act 28 of 1994)",
        "zones": [
          {
            "id": "tn_thatchanallur",
            "name": "Zone 1 - Thatchanallur",
            "name_ta": "மண்டலம் 1 - தச்சநல்லூர்",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ]
          },
          {
            "id": "tn_palai",
            "name": "Zone 2 - Palayamkottai",
            "name_ta": "மண்டலம் 2 - பாளையங்கோட்டை",
            "is_verified_zone": true,
            "wards": [
              12,
              13,
              14,
              15,
              16,
              17,
              18,
              19,
              20,
              21,
              22
            ]
          },
          {
            "id": "tn_town",
            "name": "Zone 3 - Tirunelveli Town",
            "name_ta": "மண்டலம் 3 - திருநெல்வேலி டவுன்",
            "is_verified_zone": true,
            "wards": [
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33
            ]
          },
          {
            "id": "tn_melapalayam",
            "name": "Zone 4 - Melapalayam",
            "name_ta": "மண்டலம் 4 - மேலப்பாளையம்",
            "is_verified_zone": true,
            "wards": [
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44
            ]
          },
          {
            "id": "tn_pettai",
            "name": "Zone 5 - Pettai",
            "name_ta": "மண்டலம் 5 - பேட்டை",
            "is_verified_zone": true,
            "wards": [
              45,
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55
            ]
          }
        ]
      },
      {
        "id": "ambasamudram_muni",
        "name": "Ambasamudram Municipality",
        "name_ta": "அம்பாசமுத்திரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ambasamudram_muni_general",
            "name": "Ambasamudram Municipal Area",
            "name_ta": "அம்பாசமுத்திரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tirupathur",
    "name": "Tirupathur",
    "name_ta": "திருப்பத்தூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "tirupathur_muni",
        "name": "Tirupathur Municipality",
        "name_ta": "திருப்பத்தூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "tirupathur_muni_general",
            "name": "Tirupathur Municipal Area",
            "name_ta": "திருப்பத்தூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "vaniyambadi_muni",
        "name": "Vaniyambadi Municipality",
        "name_ta": "வாணியம்பாடி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "vaniyambadi_muni_general",
            "name": "Vaniyambadi Municipal Area",
            "name_ta": "வாணியம்பாடி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "ambur_muni",
        "name": "Ambur Municipality",
        "name_ta": "ஆம்பூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "ambur_muni_general",
            "name": "Ambur Municipal Area",
            "name_ta": "ஆம்பூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tiruppur",
    "name": "Tiruppur",
    "name_ta": "திருப்பூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "tiruppur_corp",
        "name": "Tiruppur City Municipal Corporation",
        "name_ta": "திருப்பூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 7 of 2008 (Tiruppur City Municipal Corporation Act)",
        "zones": [
          {
            "id": "tpr_z1",
            "name": "Zone 1 - North Textile Corridor",
            "name_ta": "மண்டலம் 1 - வடக்கு ஜவுளி பகுதி",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15
            ]
          },
          {
            "id": "tpr_z2",
            "name": "Zone 2 - East Knitwear Hub",
            "name_ta": "மண்டலம் 2 - கிழக்கு பின்னலாடை பகுதி",
            "is_verified_zone": true,
            "wards": [
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30
            ]
          },
          {
            "id": "tpr_z3",
            "name": "Zone 3 - South Industrial",
            "name_ta": "மண்டலம் 3 - தெற்கு தொழில் பகுதி",
            "is_verified_zone": true,
            "wards": [
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45
            ]
          },
          {
            "id": "tpr_z4",
            "name": "Zone 4 - West Residential",
            "name_ta": "மண்டலம் 4 - மேற்கு குடியிருப்பு பகுதி",
            "is_verified_zone": true,
            "wards": [
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60
            ]
          }
        ]
      },
      {
        "id": "dharapuram_muni",
        "name": "Dharapuram Municipality",
        "name_ta": "தாராபுரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "dharapuram_muni_general",
            "name": "Dharapuram Municipal Area",
            "name_ta": "தாராபுரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tiruvallur",
    "name": "Tiruvallur",
    "name_ta": "திருவள்ளூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "avadi_corp",
        "name": "Avadi Municipal Corporation",
        "name_ta": "ஆவடி மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 24 of 2019 (Avadi City Municipal Corporation Act)",
        "zones": [
          {
            "id": "av_main",
            "name": "Zone 1 - Avadi Central",
            "name_ta": "மண்டலம் 1 - ஆவடி மத்தி",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15,
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24
            ]
          },
          {
            "id": "av_pattabiram",
            "name": "Zone 2 - Pattabiram & Thiruninravur",
            "name_ta": "மண்டலம் 2 - பட்டாபிராம் & திருநின்றவூர்",
            "is_verified_zone": true,
            "wards": [
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48
            ]
          }
        ]
      },
      {
        "id": "tiruvallur_muni",
        "name": "Tiruvallur Municipality",
        "name_ta": "திருவள்ளூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "tiruvallur_muni_general",
            "name": "Tiruvallur Municipal Area",
            "name_ta": "திருவள்ளூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "poonamallee_muni",
        "name": "Poonamallee Municipality",
        "name_ta": "பூந்தமல்லி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "poonamallee_muni_general",
            "name": "Poonamallee Municipal Area",
            "name_ta": "பூந்தமல்லி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tiruvannamalai",
    "name": "Tiruvannamalai",
    "name_ta": "திருவண்ணாமலை",
    "type": "District",
    "localBodies": [
      {
        "id": "tiruvannamalai_corp",
        "name": "Tiruvannamalai Municipal Corporation",
        "name_ta": "திருவண்ணாமலை மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Urban Local Bodies (Amendment) Act, 2024 / MAWS G.O. (Upgraded August 2024)",
        "constituent_units": {
          "core_municipality": "Tiruvannamalai Municipality",
          "town_panchayats": [],
          "village_panchayats": [
            "Venkikal",
            "Chinnakangeyanur",
            "Kilnachipattu",
            "Nochimalai",
            "Enthal",
            "Thaenmathur",
            "Kilikacharapattu",
            "Upoorkavu",
            "Chavalpoondi",
            "Nallavanpalayam",
            "Kananthampoondi",
            "Anaiparanthan",
            "Adiyenthal",
            "Adi Annamalai",
            "Devanendal",
            "Adaiyur",
            "Durgai Namiyenthal",
            "Malappambadi"
          ]
        },
        "zones": [
          {
            "id": "tvm_corp_general",
            "name": "Tiruvannamalai Corporation Area",
            "name_ta": "திருவண்ணாமலை மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Official corporate zone and ward delimitation notification pending publication by the Delimitation Commission"
          }
        ]
      },
      {
        "id": "arani_muni",
        "name": "Arani Municipality",
        "name_ta": "ஆரணி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "arani_muni_general",
            "name": "Arani Municipal Area",
            "name_ta": "ஆரணி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "tiruvarur",
    "name": "Tiruvarur",
    "name_ta": "திருவாரூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "tiruvarur_muni",
        "name": "Tiruvarur Municipality",
        "name_ta": "திருவாரூர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "tiruvarur_muni_general",
            "name": "Tiruvarur Municipal Area",
            "name_ta": "திருவாரூர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "mannargudi_muni",
        "name": "Mannargudi Municipality",
        "name_ta": "மன்னார்குடி நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "mannargudi_muni_general",
            "name": "Mannargudi Municipal Area",
            "name_ta": "மன்னார்குடி நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "vellore",
    "name": "Vellore",
    "name_ta": "வேலூர்",
    "type": "District",
    "localBodies": [
      {
        "id": "vellore_corp",
        "name": "Vellore Municipal Corporation",
        "name_ta": "வேலூர் மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 26 of 2008 (Vellore City Municipal Corporation Act)",
        "zones": [
          {
            "id": "vl_katpadi",
            "name": "Zone 1 - Katpadi",
            "name_ta": "மண்டலம் 1 - காட்பாடி",
            "is_verified_zone": true,
            "wards": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15
            ]
          },
          {
            "id": "vl_sathuvachari",
            "name": "Zone 2 - Sathuvachari",
            "name_ta": "மண்டலம் 2 - சத்துவாச்சாரி",
            "is_verified_zone": true,
            "wards": [
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30
            ]
          },
          {
            "id": "vl_fort",
            "name": "Zone 3 - Fort & Central",
            "name_ta": "மண்டலம் 3 - கோட்டை & மத்திய பகுதி",
            "is_verified_zone": true,
            "wards": [
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45
            ]
          },
          {
            "id": "vl_dharapadavedu",
            "name": "Zone 4 - Dharapadavedu",
            "name_ta": "மண்டலம் 4 - தாரபடவேடு",
            "is_verified_zone": true,
            "wards": [
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60
            ]
          }
        ]
      },
      {
        "id": "gudiyatham_muni",
        "name": "Gudiyatham Municipality",
        "name_ta": "குடியாத்தம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "gudiyatham_muni_general",
            "name": "Gudiyatham Municipal Area",
            "name_ta": "குடியாத்தம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "viluppuram",
    "name": "Viluppuram",
    "name_ta": "விழுப்புரம்",
    "type": "District",
    "localBodies": [
      {
        "id": "viluppuram_muni",
        "name": "Viluppuram Municipality",
        "name_ta": "விழுப்புரம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "viluppuram_muni_general",
            "name": "Viluppuram Municipal Area",
            "name_ta": "விழுப்புரம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "tindivanam_muni",
        "name": "Tindivanam Municipality",
        "name_ta": "திண்டிவனம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "tindivanam_muni_general",
            "name": "Tindivanam Municipal Area",
            "name_ta": "திண்டிவனம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  },
  {
    "id": "virudhunagar",
    "name": "Virudhunagar",
    "name_ta": "விருதுநகர்",
    "type": "District",
    "localBodies": [
      {
        "id": "sivakasi_corp",
        "name": "Sivakasi Municipal Corporation",
        "name_ta": "சிவகாசி மாநகராட்சி",
        "type": "Municipal Corporation",
        "is_corporation": true,
        "provenance": "Tamil Nadu Act 35 of 2021 (Sivakasi City Municipal Corporation Act)",
        "zones": [
          {
            "id": "sivakasi_corp_general",
            "name": "Sivakasi Corporation Area",
            "name_ta": "சிவகாசி மாநகராட்சி நிர்வாகப் பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Corporate zone delimitation pending official publication; unified municipal corporation council jurisdiction"
          }
        ]
      },
      {
        "id": "virudhunagar_muni",
        "name": "Virudhunagar Municipality",
        "name_ta": "விருதுநகர் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "virudhunagar_muni_general",
            "name": "Virudhunagar Municipal Area",
            "name_ta": "விருதுநகர் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      },
      {
        "id": "rajapalayam_muni",
        "name": "Rajapalayam Municipality",
        "name_ta": "ராஜபாளையம் நகராட்சி",
        "type": "Municipality",
        "is_corporation": false,
        "provenance": "Official Government of Tamil Nadu Urban Local Bodies Registry",
        "zones": [
          {
            "id": "rajapalayam_muni_general",
            "name": "Rajapalayam Municipal Area",
            "name_ta": "ராஜபாளையம் நகராட்சி பகுதி",
            "is_verified_zone": false,
            "wards_verified": false,
            "wards": [],
            "status_note": "Single municipal council jurisdiction; detailed ward boundaries pending official digital delimitation"
          }
        ]
      }
    ]
  }
];

const TN_CIVIC_DEPARTMENTS = [
  {
    "id": "roads_highways",
    "name": "Roads & Highways Department (TN Highways / PWD)",
    "name_ta": "நெடுஞ்சாலை மற்றும் பொதுப்பணித்துறை (TN Highways / PWD)",
    "categories": [
      "Road Damage",
      "Footpath",
      "Bridges"
    ],
    "defaultSlaHours": 24
  },
  {
    "id": "solid_waste",
    "name": "Municipal Solid Waste & Sanitation Board",
    "name_ta": "திடக்கழிவு மேலாண்மை மற்றும் துப்புரவுப் பிரிவு",
    "categories": [
      "Garbage and Sanitation",
      "Debris"
    ],
    "defaultSlaHours": 12
  },
  {
    "id": "water_supply",
    "name": "Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD",
    "name_ta": "குடிநீர் வழங்கல் மற்றும் கழிவுநீரகற்று வாரியம் (CMWSSB / TWAD)",
    "categories": [
      "Water Leakage",
      "Water Contamination"
    ],
    "defaultSlaHours": 18
  },
  {
    "id": "stormwater_drainage",
    "name": "Stormwater Drainage & Flood Mitigation Division",
    "name_ta": "மழைநீர் வடிகால் மற்றும் வெள்ளத் தடுப்புப் பிரிவு",
    "categories": [
      "Drainage",
      "Flooding",
      "Manhole"
    ],
    "defaultSlaHours": 12
  },
  {
    "id": "tangedco",
    "name": "Tamil Nadu Generation and Distribution Corporation (TANGEDCO)",
    "name_ta": "தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மானக் கழகம் (TANGEDCO)",
    "categories": [
      "Electricity",
      "Transformer",
      "Live Wire"
    ],
    "defaultSlaHours": 6
  },
  {
    "id": "street_lighting",
    "name": "Urban Local Bodies Public Lighting Division",
    "name_ta": "நகர்ப்புற உள்ளாட்சி அமைப்புகள் பொது மின்விளக்கு பிரிவு",
    "categories": [
      "Streetlight"
    ],
    "defaultSlaHours": 48
  },
  {
    "id": "public_safety",
    "name": "Public Safety & Traffic Infrastructure Wing",
    "name_ta": "பொது பாதுகாப்பு மற்றும் போக்குவரத்து உள்கட்டமைப்பு பிரிவு",
    "categories": [
      "Public Infrastructure",
      "Other"
    ],
    "defaultSlaHours": 24
  }
];

const DEFAULT_SLA_POLICY = {
  "Critical": 6,
  "High": 24,
  "Medium": 48,
  "Low": 72
};

module.exports = {
  TAMIL_NADU_DISTRICTS,
  TN_CIVIC_DEPARTMENTS,
  DEFAULT_SLA_POLICY
};

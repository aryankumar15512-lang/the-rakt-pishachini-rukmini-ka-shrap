export type LanguageCode = 'hi' | 'en';

export interface StoryChapter {
  title: string;
  text: string;
  durationLabel: string;
  img: string;
}

export interface CursedRelicInfo {
  id: string;
  type: 'anklet' | 'veil' | 'dagger' | 'urn';
  nameHi: string;
  nameEn: string;
  roomHi: string;
  roomEn: string;
}

export const CURSED_RELIC_TYPES: CursedRelicInfo[] = [
  {
    id: 'anklet',
    type: 'anklet',
    nameHi: 'टूटी चूड़ियाँ (Broken Bangles)',
    nameEn: 'Broken Bridal Bangles (Chudiyan)',
    roomHi: 'उत्तरी कक्ष (North Chamber)',
    roomEn: 'North Bridal Chamber',
  },
  {
    id: 'urn',
    type: 'urn',
    nameHi: 'सिंदूर की डिब्बी (Sindoor Box)',
    nameEn: 'Cursed Sindoor Box',
    roomHi: 'दक्षिणी मंडप (South Sanctum)',
    roomEn: 'South Ritual Sanctum',
  },
  {
    id: 'dagger',
    type: 'dagger',
    nameHi: 'शापित पायल (Cursed Payal)',
    nameEn: 'Cursed Bridal Payal (Anklet)',
    roomHi: 'पश्चिमी तहखाना (West Crypt)',
    roomEn: 'West Tantrik Crypt',
  },
  {
    id: 'veil',
    type: 'veil',
    nameHi: 'लाल चुनरी (Crimson Bridal Chunari)',
    nameEn: 'Burnt Crimson Chunari (Veil)',
    roomHi: 'पूर्वी गलियारा (East Hall)',
    roomEn: 'East Portrait Hall',
  },
];

export type VNTextDirection =
  | 'bottom'
  | 'left'
  | 'right'
  | 'top'
  | 'center';

export type VNTextStyle =
  | 'normal'
  | 'red'
  | 'jolt'
  | 'jolt-red-giant'
  | 'lightning'
  | 'shake'
  | 'fade-blur'
  | 'quiet-small'
  | 'blackout-final';

export type VNSpeakerVoice =
  | 'narrator'
  | 'rahul'
  | 'aarav'
  | 'neha'
  | 'riya'
  | 'aman'
  | 'kabir'
  | 'dev'
  | 'watchman'
  | 'rukmini'
  | 'tantrik'
  | 'thakur'
  | 'husband';

export type VNSoundCue =
  | 'scene1_drive_crickets'
  | 'scene1_silence'
  | 'scene1_engine_stall_hiss'
  | 'scene2_thunder_gate'
  | 'scene2_rain_lantern'
  | 'scene3_shehnai_payal'
  | 'scene3_crows_overtake'
  | 'scene4_basement_torches'
  | 'scene4_heavy_silence'
  | 'scene5_glass_clink'
  | 'scene5_slowing_heartbeat'
  | 'scene5_heartbeat_stop'
  | 'scene6_black_fire_mantra'
  | 'scene6_distant_scream'
  | 'scene7_well_drop'
  | 'scene7_gasp_whisper'
  | 'scene8_stone_shatter_wind'
  | 'scene8_stairs_payal_doors'
  | 'scene9_lantern_sad_music'
  | 'scene9_four_relic_chimes'
  | 'scene10_gate_slam_silence'
  | 'scene10_approaching_payal'
  | 'scene10_jumpscare_boom'
  | 'scene10_cut_silence';

export interface VNDialogueLine {
  speaker?: string;
  text: string;
  direction: VNTextDirection;
  style: VNTextStyle;
  photoIndex: 0 | 1 | 2;
  voice: VNSpeakerVoice;
  soundCue?: VNSoundCue;
  timeOffsetSec: number; // Exact start offset (seconds) inside this scene
  durationSec: number;   // How long this beat stays on screen
  imagePrompt?: string;
  chunkImagePrompts?: string[];
}

export interface VNPhotoSpec {
  id: string;
  captionHi: string;
  zoomDirection: 'in' | 'out';
  sepia?: boolean;
}

export interface VNSceneSpec {
  sceneNumber: number;
  durationSec: number; // Exact scene duration in seconds
  timeRangeLabel: string;
  titleHi: string;
  subtitleHi: string;
  soundSummaryHi: string;
  photos: [VNPhotoSpec, VNPhotoSpec, VNPhotoSpec];
  lines: VNDialogueLine[];
}

/**
 * 10-Scene Master Continuous Timeline Dataset
 * Total Duration: 50 + 55 + 55 + 60 + 60 + 60 + 55 + 65 + 65 + 60 = 585 seconds (9 minutes 45 seconds).
 * Each scene has 3 smooth crossfading visual layers and 7 to 9 dialogue/narration beats.
 */
export const VN_STORY_SCENES: VNSceneSpec[] = [
  // ==========================================================================
  // SCENE 1: 50 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 1,
    durationSec: 50,
    timeRangeLabel: '0:00–0:50',
    titleHi: 'सीन 1: काली घाटी',
    subtitleHi: 'रात का जंगल, घना कोहरा और सुनसान मोड़ पर लाल साड़ी वाली परछाईं',
    soundSummaryHi: 'झींगुरों की आवाज़, दूर सियारों का रोना, कार का धीमा इंजन → अचानक सन्नाटा → इंजन का झटका और गर्म रेडिएटर की फ़िस्स',
    photos: [
      {
        id: 's1_p1',
        captionHi: 'रात का घना जंगल, गहरा कोहरा, सुनसान पहाड़ी मोड़ पर एक पुरानी कार',
        zoomDirection: 'in',
      },
      {
        id: 's1_p2',
        captionHi: 'कार की हेडलाइट में सड़क किनारे खड़ी लाल साड़ी वाली धुंधली परछाईं',
        zoomDirection: 'in',
      },
      {
        id: 's1_p3',
        captionHi: 'इंजन से निकलता गर्म सफेद धुआँ, ठंडी वीरान घाटी और बंद पड़ा डैशबोर्ड',
        zoomDirection: 'out',
      },
    ],
    lines: [
      {
        text: 'रात के दो बज रहे थे... काली घाटी की सड़क पर दूर-दूर तक कोई रोशनी नहीं थी।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene1_drive_crickets',
        timeOffsetSec: 1,
        durationSec: 5.5,
        imagePrompt:
          'pitch black deserted mountain road through dense Kali Ghati forest at 2am midnight with dark SUV headlights cutting through thick fog',
      },
      {
        text: 'चारों दोस्त शहर लौट रहे थे। जीपीएस कब का बंद हो चुका था और मोबाइल नेटवर्क गायब था।',
        direction: 'left',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 7,
        durationSec: 5.5,
        imagePrompt:
          'interior dashboard view of an SUV at night showing dead GPS navigation screen with no mobile signal and four anxious young Indian friends',
      },
      {
        speaker: 'राहुल',
        text: 'राहुल: "यार, ये रास्ता इतना शांत क्यों है? पिछले एक घंटे से कोई दूसरी गाड़ी नहीं दिखी।"',
        direction: 'right',
        style: 'normal',
        photoIndex: 0,
        voice: 'rahul',
        timeOffsetSec: 13,
        durationSec: 5.5,
        imagePrompt:
          'young Indian driver Rahul nervously gripping the SUV steering wheel staring through rain-streaked windshield into empty haunted forest road',
      },
      {
        speaker: 'अमन',
        text: 'अमन: "शायद यह पुराना बाईपास है... पर सड़क पर यह अजीब सा काला कोहरा कैसा है?"',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'aman',
        timeOffsetSec: 19,
        durationSec: 5.5,
        imagePrompt:
          'creepy swirling black supernatural mist rolling across an isolated forest asphalt road in front of car headlights at midnight',
      },
      {
        text: 'तभी कार की पीली हेडलाइट्स के सामने, सड़क के ठीक बीचों-बीच कोई खड़ा था...',
        direction: 'top',
        style: 'red',
        photoIndex: 1,
        voice: 'narrator',
        soundCue: 'scene1_silence',
        timeOffsetSec: 25,
        durationSec: 5.5,
        imagePrompt:
          'eerie silhouette of a lone woman standing dead center on a dark foggy forest road illuminated by yellow SUV headlights',
      },
      {
        speaker: 'नेहा',
        text: 'नेहा: "गाड़ी रोको! सामने देखो... कोई औरत खड़ी है लाल कपड़ों में!"',
        direction: 'center',
        style: 'jolt',
        photoIndex: 1,
        voice: 'neha',
        timeOffsetSec: 31,
        durationSec: 5.5,
        imagePrompt:
          'terrified ghostly woman in drenched crimson red Indian saree standing motionless directly in front of glaring car headlights on lonely forest road',
      },
      {
        text: 'ब्रेक पर पैर पड़ा, टायरों की चीख गूंजी, पर हेडलाइट्स की रोशनी में सामने कोई नहीं था... सिर्फ खाली सड़क।',
        direction: 'left',
        style: 'shake',
        photoIndex: 1,
        voice: 'narrator',
        timeOffsetSec: 37,
        durationSec: 5.5,
        imagePrompt:
          'skid marks on wet midnight forest road lit by bright car beams showing completely empty deserted asphalt after ghost vanished',
      },
      {
        speaker: 'राहुल',
        text: 'राहुल: "अरे नहीं... गाड़ी का बोनट उबल रहा है! इंजन बंद हो गया!"',
        direction: 'bottom',
        style: 'jolt',
        photoIndex: 2,
        voice: 'rahul',
        soundCue: 'scene1_engine_stall_hiss',
        timeOffsetSec: 43,
        durationSec: 6.0,
        imagePrompt:
          'stalled black SUV on a stormy dark road with thick white steam and smoke billowing out from under the open hot hood',
      },
    ],
  },

  // ==========================================================================
  // SCENE 2: 55 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 2,
    durationSec: 55,
    timeRangeLabel: '0:50–1:45',
    titleHi: 'सीन 2: हवेली और चौकीदार',
    subtitleHi: 'बिजली की भयंकर चमक में ठाकुर हवेली का विशाल लोहे का फाटक और बूढ़ा चौकीदार',
    soundSummaryHi: 'तेज मूसलाधार बारिश, बादलों की भारी गड़गड़ाहट, लोहे के जंग लगे फाटक की चीख और चौकीदार की कांपती बूढ़ी आवाज़',
    photos: [
      {
        id: 's2_p1',
        captionHi: 'बिजली की कड़कड़ाहट में विशाल पुरानी ठाकुर हवेली का खंडहरनुमा काला फाटक',
        zoomDirection: 'in',
      },
      {
        id: 's2_p2',
        captionHi: 'कांपती पीली लालटेन लिए झुर्रियों से भरा पुराना बूढ़ा चौकीदार',
        zoomDirection: 'out',
      },
      {
        id: 's2_p3',
        captionHi: 'अँधेरे गलियारे की ओर इशारा करती थरथराती बूढ़ी उंगलियाँ और बारिश की मोटी धार',
        zoomDirection: 'in',
      },
    ],
    lines: [
      {
        text: 'अचानक मूसलाधार बारिश शुरू हो गई। आसमान चीरती बिजली की चमक में एक विशाल हवेली दिखाई दी।',
        direction: 'top',
        style: 'lightning',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene2_thunder_gate',
        timeOffsetSec: 1,
        durationSec: 6.0,
        imagePrompt:
          'torrential midnight rain and bright lightning bolt splitting dark storm sky revealing a towering gothic Indian ancestral mansion on hill',
      },
      {
        text: 'सड़क किनारे पुराना बोर्ड जंग से लटक रहा था—"ठाकुर अमरेंद्र सिंह हवेली, निर्माण 1884"।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 7.5,
        durationSec: 6.0,
        imagePrompt:
          'close-up of a weathered rusted iron nameplate hanging crookedly in pouring rain reading Thakur Amarendra Singh Haveli 1884',
      },
      {
        speaker: 'अमन',
        text: 'अमन: "वहाँ बरामदे में एक पीली रोशनी हिल रही है! चलो, बारिश थमने तक वहीं शरण लेते हैं।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 0,
        voice: 'aman',
        timeOffsetSec: 14,
        durationSec: 6.0,
        imagePrompt:
          'four soaked young Indian friends running through heavy rain toward a distant warm swaying yellow lantern light on an old mansion veranda',
      },
      {
        text: 'तभी लोहे का भारी जंग लगा फाटक अपने आप चरमराते हुए खुला... और सामने एक बूढ़ा चौकीदार खड़ा था।',
        direction: 'center',
        style: 'jolt',
        photoIndex: 1,
        voice: 'narrator',
        soundCue: 'scene2_rain_lantern',
        timeOffsetSec: 20.5,
        durationSec: 6.0,
        imagePrompt:
          'massive rusted wrought iron Haveli gates creaking open slowly in storm revealing an eerie old wrinkled Indian watchman standing in mist',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "रुक जाओ बच्चों... अपने कदम यहीं रोक लो। इस दहलीज को पार करने की भूल मत करना।"',
        direction: 'right',
        style: 'shake',
        photoIndex: 1,
        voice: 'watchman',
        timeOffsetSec: 27,
        durationSec: 6.5,
        imagePrompt:
          'old Indian watchman Baba holding out his trembling hand warning four frightened youths at the stone threshold of Thakur Haveli',
      },
      {
        speaker: 'नेहा',
        text: 'नेहा: "बाबा, बाहर तूफ़ान है और हमारी गाड़ी खराब हो चुकी है। बस कुछ देर छत के नीचे खड़े रहने दीजिए।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 1,
        voice: 'neha',
        timeOffsetSec: 34,
        durationSec: 6.5,
        imagePrompt:
          'four young Indian friends drenched in heavy pouring rain beside their broken-down SUV outside the giant rusted Haveli iron gate at night',
        chunkImagePrompts: [
          'four young Indian friends drenched in heavy pouring rain beside their broken-down SUV outside the giant rusted Haveli iron gate at night',
          'soaked young Indian woman Neha and friends gripping rusted iron Haveli gate bars pleading desperately for shelter in fierce thunderstorm',
        ],
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "तूफ़ान से बच जाओगे बेटा, पर जो इस हवेली की दीवारों के भीतर सांस ले रही है, उससे नहीं बचोगे।"',
        direction: 'right',
        style: 'red',
        photoIndex: 2,
        voice: 'watchman',
        timeOffsetSec: 41,
        durationSec: 6.5,
        imagePrompt:
          'old Indian watchman Baba in dark shawl at the iron gate pointing back fearfully toward the ominous shadowed Thakur Haveli walls',
        chunkImagePrompts: [
          'old Indian watchman Baba in dark shawl standing under pouring storm rain beside the iron gate speaking cautiously',
          'old watchman Baba pointing grimly back toward the looming shadowed ancestral Thakur Haveli walls where an evil presence lurks',
        ],
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "तीस साल से यह हवेली खून की प्यासी है... यहाँ जो रात में आया, उसने कभी अगली सुबह का सूरज नहीं देखा।"',
        direction: 'bottom',
        style: 'jolt-red-giant',
        photoIndex: 2,
        voice: 'watchman',
        timeOffsetSec: 48,
        durationSec: 6.5,
        imagePrompt:
          'wide exterior shot of the cursed decaying ancestral Thakur Haveli palace looming under blood-red lightning storm at midnight',
        chunkImagePrompts: [
          'wide exterior shot of the cursed decaying ancestral Thakur Haveli palace looming under blood-red lightning storm at midnight',
          'long dark haunted Thakur Haveli stone corridor with eerie shadows and flickering brass oil lamps at night',
        ],
      },
    ],
  },

  // ==========================================================================
  // SCENE 3: 55 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 3,
    durationSec: 55,
    timeRangeLabel: '1:45–2:40',
    titleHi: 'सीन 3: 1992 की बारात और टूटी शहनाई',
    subtitleHi: '30 साल पुराना सेपिया फ्लैशबैक: दुल्हन रुक्मिणी, मनहूस कौवे और खामोश आँगन',
    soundSummaryHi: 'पुरानी शहनाई की धीमी बेसुरी धुन, पायल की भारी छन-छन, फिर अचानक सैकड़ों कौवों की डरावनी काँव-काँव',
    photos: [
      {
        id: 's3_p1',
        captionHi: '1992 की मनहूस शादी: फूलों से सजी डोली, हवेली के आँगन में उतरती नई दुल्हन रुक्मिणी',
        zoomDirection: 'in',
        sepia: true,
      },
      {
        id: 's3_p2',
        captionHi: 'हवेली की मुंडेरों और छज्जों पर बैठे अनगिनत काले कौवे, उदास गूंजती शहनाई',
        zoomDirection: 'out',
        sepia: true,
      },
      {
        id: 's3_p3',
        captionHi: 'घूंघट में ढंका रुक्मिणी का चेहरा, लाल बनारसी जोड़ा और लाल आलता से रंगे पाँव',
        zoomDirection: 'in',
        sepia: true,
      },
    ],
    lines: [
      {
        text: 'चौकीदार ने कांपते हाथों से अपनी पुरानी लालटेन उठाई और उसकी आँखों में 1992 का खौफ तैर गया...',
        direction: 'bottom',
        style: 'fade-blur',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene3_shehnai_payal',
        timeOffsetSec: 1,
        durationSec: 6.0,
        imagePrompt:
          'close-up of old wrinkled Indian watchman Baba lifting his glowing antique brass oil lantern with trembling hands in heavy midnight rain',
        chunkImagePrompts: [
          'close-up of old wrinkled Indian watchman Baba lifting his glowing antique brass oil lantern with trembling hands in heavy midnight rain',
          'extreme close-up of terrified old Indian watchman eyes reflecting flickering fire flames and haunted 1992 memories',
        ],
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "साल 1992 था... फागुन की पूर्णिमा। ठाकुर के छोटे बेटे की शादी इसी हवेली में हुई थी।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 0,
        voice: 'watchman',
        timeOffsetSec: 7.5,
        durationSec: 6.5,
        imagePrompt:
          'giant glowing blood-red full moon Purnima shining above the grand heritage Thakur Haveli night sky',
        chunkImagePrompts: [
          'giant glowing blood-red full moon Purnima shining above the grand heritage Thakur Haveli night sky',
          '1992 royal Indian wedding ceremony with groom in sherwani, marigold garlands, brass torches and warm candlelit Haveli courtyard',
        ],
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "दुल्हन का नाम रुक्मिणी था। फूलों की डोली जब हवेली के आंगन में उतरी, तो शहनाई बज रही थी।"',
        direction: 'right',
        style: 'normal',
        photoIndex: 0,
        voice: 'watchman',
        timeOffsetSec: 14.5,
        durationSec: 6.5,
        imagePrompt:
          'beautiful young Indian bride Rukmini in rich crimson red Banarasi bridal saree veil and traditional gold jewelry',
        chunkImagePrompts: [
          'beautiful young Indian bride Rukmini in rich crimson red Banarasi bridal saree veil and traditional gold jewelry sitting gracefully',
          'traditional Indian wooden bridal Palki Doli palanquin decorated with fresh marigold and red rose flowers arriving in illuminated Haveli courtyard',
        ],
      },
      {
        text: 'पर वह कोई खुशियों की शादी नहीं थी। आंगन की तुलसी का पौधा उसी शाम बिना कारण सूखकर काला पड़ गया था।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 1,
        voice: 'narrator',
        timeOffsetSec: 21.5,
        durationSec: 6.5,
        imagePrompt:
          'sacred tulsi plant in an ornate stone courtyard planter suddenly withered and blackened mysteriously during an eerie dusk wind',
      },
      {
        text: 'जैसे ही रुक्मिणी के लाल आलता लगे पैरों ने हवेली की चौखट छुई, सैकड़ों काले कौवे मुंडेर पर आकर चीखने लगे।',
        direction: 'top',
        style: 'shake',
        photoIndex: 1,
        voice: 'narrator',
        soundCue: 'scene3_crows_overtake',
        timeOffsetSec: 28.5,
        durationSec: 6.5,
        imagePrompt:
          'bride feet painted with red aalta dye and silver anklets stepping onto stone threshold while hundreds of black crows shriek on mansion rooftop',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "शहनाई बजाने वाले की सांस अचानक फूल गई और शहनाई टूटकर दो टुकड़ों में फर्श पर गिर पड़ी।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 1,
        voice: 'watchman',
        timeOffsetSec: 35.5,
        durationSec: 6.0,
        imagePrompt:
          'broken wooden wedding shehnai musical instrument snapped in two pieces lying on dark marble Haveli floor in ominous shadow',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: (धीमी घबराई फुसफुसाहट) "यहाँ हवा में श्मशान की गंध क्यों आ रही है? मुझे यह जगह ठीक नहीं लग रही..."',
        direction: 'center',
        style: 'quiet-small',
        photoIndex: 2,
        voice: 'rukmini',
        timeOffsetSec: 42,
        durationSec: 6.0,
        imagePrompt:
          'frightened Indian bride Rukmini peeking nervously from behind her red bridal veil smelling cremation ground ash in dark mansion hallway',
      },
      {
        text: 'मासूम दुल्हन नहीं जानती थी कि उसे ब्याह कर नहीं लाया गया था... बल्कि उसे एक खूनी सौदे के तहत खरीदा गया था।',
        direction: 'bottom',
        style: 'red',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 48.5,
        durationSec: 6.0,
        imagePrompt:
          'innocent bride Rukmini silhouetted against looming cruel shadows of Thakur men whispering a bloody occult bargain behind carved pillars',
      },
    ],
  },

  // ==========================================================================
  // SCENE 4: 60 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 4,
    durationSec: 60,
    timeRangeLabel: '2:40–3:40',
    titleHi: 'सीन 4: तांत्रिक का लालच और गुप्त तहखाना',
    subtitleHi: 'तहखाने की पुरानी लोहे की तिजोरी, अघोरी तांत्रिक कालभैरव और सोने का खूनी लालच',
    soundSummaryHi: 'तहखाने की दीवार से टपकते पानी की आवाज़, मशालों की धधक, भारी ज़ंजीरों की खड़खड़ाहट और भारी सन्नाटा',
    photos: [
      {
        id: 's4_p1',
        captionHi: 'अँधेरा पत्थर का तहखाना, जलती मशालें और गुप्त लोहे की सीलबंद तिजोरी',
        zoomDirection: 'in',
      },
      {
        id: 's4_p2',
        captionHi: 'काले वस्त्रों में भयानक अघोरी तांत्रिक कालभैरव और लोभी ठाकुर आमने-सामने',
        zoomDirection: 'out',
      },
      {
        id: 's4_p3',
        captionHi: 'तिजोरी पर बने प्राचीन खोपड़ी के तांत्रिक चिन्ह और फर्श पर बिखरी काली राख',
        zoomDirection: 'in',
      },
    ],
    lines: [
      {
        text: 'हवेली के नीचे गहरा पत्थर का तहखाना था, जहाँ सदियों पुरानी एक गुप्त तिजोरी दबी थी।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene4_basement_torches',
        timeOffsetSec: 1,
        durationSec: 6.5,
        imagePrompt:
          'deep underground stone dungeon vault beneath an old Indian mansion lit by flickering wall torches revealing an ancient sealed iron safe',
      },
      {
        text: 'कहते हैं उसमें सात पुश्तों का अपार खजाना था, पर उस पर सात पिशाचों का कड़ा तांत्रिक पहरा लगा था।',
        direction: 'left',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 8,
        durationSec: 7.0,
        imagePrompt:
          'ancient cursed iron treasure vault covered in glowing red Tantrik yantra symbols skulls and heavy rusted iron chains in subterranean crypt',
      },
      {
        speaker: 'ठाकुर',
        text: 'ठाकुर अमरेंद्र: "बाबा! मुझे वह सारा सोना चाहिए... चाहे जो कीमत चुकानी पड़े, यह तिजोरी आज ही खुलेगी!"',
        direction: 'right',
        style: 'normal',
        photoIndex: 1,
        voice: 'thakur',
        timeOffsetSec: 15.5,
        durationSec: 7.0,
        imagePrompt:
          'greedy ruthless aristocrat Thakur Amarendra Singh in royal turban glaring obsessively at sealed underground treasure vault in torchlight',
      },
      {
        speaker: 'तांत्रिक',
        text: 'तांत्रिक कालभैरव: "यह कोई साधारण ताला नहीं है ठाकुर। यह पिशाच-मुद्रा है, जो सिर्फ जिंदा खून से खुलती है।"',
        direction: 'left',
        style: 'red',
        photoIndex: 1,
        voice: 'tantrik',
        soundCue: 'scene4_heavy_silence',
        timeOffsetSec: 23,
        durationSec: 7.5,
        imagePrompt:
          'sinister black-clad Aghori Tantrik Kalbhairav with ash smeared forehead and red tilak touching demonic blood seal lock in dark basement',
      },
      {
        speaker: 'तांत्रिक',
        text: 'तांत्रिक कालभैरव: "हमें अमावस्या की रात एक पवित्र सुहागन दुल्हन की संपूर्ण बलि देनी होगी।"',
        direction: 'center',
        style: 'jolt-red-giant',
        photoIndex: 1,
        voice: 'tantrik',
        timeOffsetSec: 31,
        durationSec: 7.0,
        imagePrompt:
          'terrifying close-up of sinister Aghori Tantrik raising ritual skull and dagger under dim red firelight speaking of Amavasya human sacrifice',
      },
      {
        speaker: 'ठाकुर',
        text: 'ठाकुर अमरेंद्र: "मेरी बहू रुक्मिणी... उसका इस दुनिया में कोई मायका नहीं बचा। कोई पूछने वाला नहीं आएगा।"',
        direction: 'bottom',
        style: 'shake',
        photoIndex: 2,
        voice: 'thakur',
        timeOffsetSec: 38.5,
        durationSec: 7.0,
        imagePrompt:
          'cold-hearted Thakur Amarendra Singh conspiring in dark cellar corner with wicked smirk as torch shadows dance across stone arches',
      },
      {
        text: 'सोने की हवस में अंधे होकर ससुर और पति दोनों ने उस मासूम लड़की की जिंदगी का सौदा कर लिया।',
        direction: 'top',
        style: 'red',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 46,
        durationSec: 6.5,
        imagePrompt:
          'father-in-law and groom standing in dark chamber shaking hands over an ancient gold coin and Tantrik black magic book in dim candlelight',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "उस रात तहखाने की दीवारों से रोने की ऐसी ठंडी आहें उठी थीं कि पहरेदार भी थरथरा गए थे।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 2,
        voice: 'watchman',
        timeOffsetSec: 53,
        durationSec: 6.5,
        imagePrompt:
          'trembling guards holding spears outside heavy stone basement stairs as ghostly mist and weeping echoes drift up from below',
      },
    ],
  },

  // ==========================================================================
  // SCENE 5: 60 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 5,
    durationSec: 60,
    timeRangeLabel: '3:40–4:40',
    titleHi: 'सीन 5: सुहागरात का विश्वासघात और विष',
    subtitleHi: 'सजा हुआ दुल्हन का कमरा, केसर का विषैला दूध और पीछे से बढ़ती काली परछाइयाँ',
    soundSummaryHi: 'काँच के गिलास की हल्की खनक, रुक्मिणी की धीमी होती दिल की धड़कन (धक-धक) और अचानक धड़कन का रुक जाना',
    photos: [
      {
        id: 's5_p1',
        captionHi: 'फूलों से सजे कमरे में चांदी के गिलास में दूध लिए बैठी अनजान दुल्हन रुक्मिणी',
        zoomDirection: 'in',
      },
      {
        id: 's5_p2',
        captionHi: 'अँधेरे गलियारे से कमरे की ओर चुपचाप बढ़ती तांत्रिक और ठाकुर की लंबी खौफनाक परछाइयाँ',
        zoomDirection: 'in',
      },
      {
        id: 's5_p3',
        captionHi: 'फर्श पर गिरकर टूटा हुआ चांदी का गिलास, छलका हुआ दूध और बेसुध गिरी रुक्मिणी',
        zoomDirection: 'out',
      },
    ],
    lines: [
      {
        text: 'सुहागरात की सेज फूलों से महक रही थी। रुक्मिणी अपने पति के आने का इंतज़ार कर रही थी।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 1,
        durationSec: 7.0,
        imagePrompt:
          'ornate 1992 Indian bridal bedroom decorated with marigold and jasmine flower garlands and flickering brass oil lamps waiting quietly',
      },
      {
        speaker: 'पति',
        text: 'पति: "रुक्मिणी, यह केसर और बादाम का दूध पी लो... हमारे नए जीवन की शुरुआत के लिए।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 0,
        voice: 'husband',
        soundCue: 'scene5_glass_clink',
        timeOffsetSec: 8.5,
        durationSec: 7.0,
        imagePrompt:
          'deceitful groom handing an ornate silver cup of glowing saffron poisoned milk to unsuspecting bride Rukmini in dim candlelit bedroom',
      },
      {
        text: 'रुक्मिणी ने अपने पति की आँखों में देखा। उसे क्या पता था कि उस मीठे दूध में धतूरा और तांत्रिक विष घुला था।',
        direction: 'right',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 16,
        durationSec: 7.0,
        imagePrompt:
          'close-up of silver glass of saffron milk swirling with eerie dark purple toxic poison herbs in dark bridal chamber',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: "मेरा सिर इतना भारी क्यों हो रहा है? मेरी आँखों के आगे अंधेरा क्यों छा रहा है...?"',
        direction: 'center',
        style: 'shake',
        photoIndex: 1,
        voice: 'rukmini',
        soundCue: 'scene5_slowing_heartbeat',
        timeOffsetSec: 23.5,
        durationSec: 7.0,
        imagePrompt:
          'dizzy poisoned Indian bride Rukmini clutching her forehead as the candlelit floral bedroom spins into dark crimson shadows',
      },
      {
        text: 'कमरे का भारी लकड़ी का दरवाज़ा खुला... और तांत्रिक कालभैरव काले कपन और लोहे की साँकलें लिए अंदर आ गया।',
        direction: 'top',
        style: 'jolt',
        photoIndex: 1,
        voice: 'narrator',
        timeOffsetSec: 31,
        durationSec: 7.0,
        imagePrompt:
          'heavy carved wooden bedroom door swinging open revealing sinister Tantrik Kalbhairav carrying black shroud cloth and heavy iron chains',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: (कांपते होंठों से) "आप सब... मेरे साथ यह क्या कर रहे हैं? मुझे बचाओ... कोई तो बचाओ!"',
        direction: 'center',
        style: 'red',
        photoIndex: 2,
        voice: 'rukmini',
        timeOffsetSec: 38.5,
        durationSec: 7.0,
        imagePrompt:
          'helpless paralyzed Indian bride screaming silently in horror as dark silhouettes surround her floral bed in dim torchlight',
      },
      {
        text: 'रुक्मिणी के हाथ से गिलास छूटकर फर्श पर बिखर गया। उसका शरीर सुन्न पड़ गया, पर आँखें सब देख रही थीं।',
        direction: 'bottom',
        style: 'fade-blur',
        photoIndex: 2,
        voice: 'narrator',
        soundCue: 'scene5_heartbeat_stop',
        timeOffsetSec: 46,
        durationSec: 7.0,
        imagePrompt:
          'spilled silver milk glass shattered on dark stone floor beside fallen marigold petals and unconscious bride hand',
      },
      {
        speaker: 'पति',
        text: 'पति: "खामोश रहो रुक्मिणी... तुम्हारा बलिदान इस खानदान को अमर दौलत देगा।"',
        direction: 'left',
        style: 'quiet-small',
        photoIndex: 2,
        voice: 'husband',
        timeOffsetSec: 53.5,
        durationSec: 6.0,
        imagePrompt:
          'cruel cold-eyed husband leaning in shadow whispering over helpless bride Rukmini while holding iron shackles',
      },
    ],
  },

  // ==========================================================================
  // SCENE 6: 60 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 6,
    durationSec: 60,
    timeRangeLabel: '4:40–5:40',
    titleHi: 'सीन 6: काली आग और खूनी बलि',
    subtitleHi: 'तहखाने का हवन कुंड, नीली-काली लपटें, उल्टे पैर बांधने की क्रिया और रुक्मिणी की चीख',
    soundSummaryHi: 'काली आग की भयानक धधक, संस्कृत के विकृत तांत्रिक मंत्र, हड्डियों के चटकने की ध्वनि और दिल दहलाने वाली चीख',
    photos: [
      {
        id: 's6_p1',
        captionHi: 'तहखाने के बीच बना काला हवन कुंड, उसमें से निकलती रहस्यमयी नीली और काली लपटें',
        zoomDirection: 'in',
      },
      {
        id: 's6_p2',
        captionHi: 'हवन की लपटों के पीछे दहकती लाल अंगारों जैसी तांत्रिक कालभैरव की भयानक आँखें',
        zoomDirection: 'in',
      },
      {
        id: 's6_p3',
        captionHi: 'लोहे की कीलों से जकड़ी हुई रुक्मिणी, मंत्रों की अग्नि में सुलगती लाल दुल्हन की चुनरी',
        zoomDirection: 'out',
      },
    ],
    lines: [
      {
        text: 'तहखाने के ठीक बीचों-बीच नर-कंकालों की खोपड़ियों से एक गहरा हवन कुंड बनाया गया था।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene6_black_fire_mantra',
        timeOffsetSec: 1,
        durationSec: 7.0,
        imagePrompt:
          'terrifying ritual Havan Kund fire pit encircled by human skulls inside deep stone basement chamber of Thakur Haveli',
      },
      {
        text: 'जैसे ही तांत्रिक ने उसमें काला तेल डाला, उसमें से लाल नहीं... बल्कि सर्द नीली और काली आग भड़क उठी।',
        direction: 'top',
        style: 'lightning',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 8.5,
        durationSec: 7.0,
        imagePrompt:
          'unnatural freezing blue and black occult flames erupting wildly from a Tantrik Havan fire pit inside dark underground vault',
      },
      {
        speaker: 'तांत्रिक',
        text: 'तांत्रिक कालभैरव: "ॐ क्रीं रक्त-पिशाचिनी बंधाय... इसके पैरों को उल्टा मोड़ दो, ताकि इसकी आत्मा कभी भाग न सके!"',
        direction: 'left',
        style: 'red',
        photoIndex: 1,
        voice: 'tantrik',
        timeOffsetSec: 16,
        durationSec: 7.5,
        imagePrompt:
          'possessed Aghori Tantrik chanting dark Sanskrit mantras with glowing ember-red eyes behind eerie blue ritual flames',
      },
      {
        text: 'तांत्रिक ने काले धागों और लोहे की कीलों से रुक्मिणी के दोनों पंजों को जबरन पीछे की ओर मोड़कर बांध दिया।',
        direction: 'center',
        style: 'jolt',
        photoIndex: 1,
        voice: 'narrator',
        timeOffsetSec: 24,
        durationSec: 7.0,
        imagePrompt:
          'dark iron nails and black ritual threads binding bridal feet with silver anklets on cold basement altar stone in flickering firelight',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: "आह्ह्ह्ह! भगवान के लिए मुझे छोड़ दो... मेरे पैर तोड़ दिए तुमने! हे भगवान, ये क्या कर रहे हो!"',
        direction: 'center',
        style: 'jolt-red-giant',
        photoIndex: 1,
        voice: 'rukmini',
        soundCue: 'scene6_distant_scream',
        timeOffsetSec: 31.5,
        durationSec: 7.5,
        imagePrompt:
          'agonized Indian bride in burnt red saree chained beside black fire ritual screaming in terror inside stone dungeon',
      },
      {
        text: 'रुक्मिणी की चीखें तहखाने की मोटी पत्थरों की दीवारों से टकराकर दम तोड़ती रहीं। किसी को तरस नहीं आया।',
        direction: 'right',
        style: 'shake',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 39.5,
        durationSec: 6.5,
        imagePrompt:
          'thick damp stone dungeon walls and iron-barred ceiling trapping echoing screams inside dark cellar with merciless shadowy onlookers',
      },
      {
        speaker: 'तांत्रिक',
        text: 'तांत्रिक कालभैरव: "इसका सुहाग का सिंदूर और चूड़ियाँ उतार लो... यह अब औरत नहीं, इस हवेली की शापित पिशाचिनी बनेगी!"',
        direction: 'left',
        style: 'red',
        photoIndex: 2,
        voice: 'tantrik',
        timeOffsetSec: 46.5,
        durationSec: 7.0,
        imagePrompt:
          'shattered red glass bangles spilled vermilion sindoor box and burnt red bridal chunari veil lying next to ritual Havan embers',
      },
      {
        text: 'काले खंजर से रुक्मिणी के गले पर खूनी वार किया गया... और उसका पवित्र रक्त उस सीलबंद तिजोरी पर छिड़क दिया गया।',
        direction: 'bottom',
        style: 'jolt-red-giant',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 54,
        durationSec: 5.5,
        imagePrompt:
          'black iron Tantrik ceremonial dagger dripping crimson blood onto the skull-carved vault door unlocking glowing red cracks',
      },
    ],
  },

  // ==========================================================================
  // SCENE 7: 55 seconds (7 beats)
  // ==========================================================================
  {
    sceneNumber: 7,
    durationSec: 55,
    timeRangeLabel: '5:40–6:35',
    titleHi: 'सीन 7: सूखे कुएं का श्राप',
    subtitleHi: 'हवेली के पीछे का सूखा कुआँ, रुक्मिणी को नीचे फेंकना और उसकी अंतिम खौफनाक कसम',
    soundSummaryHi: 'कुएं की गहराई में भारी शरीर गिरने की गूँजती आवाज़ (धड़ाम), पानी की बूंदें, धीमी सिसकी और अंतिम फुसफुसाहट',
    photos: [
      {
        id: 's7_p1',
        captionHi: 'हवेली के पीछे वीरान आँगन में बना गहरा सूखा कुआँ, ऊपर आसमान में ठिठुरता पूरा चाँद',
        zoomDirection: 'in',
      },
      {
        id: 's7_p2',
        captionHi: 'अँधेरे कुएं के पाताल से ऊपर की ओर घूरती हुई दो खून जैसी लाल जलती आँखें',
        zoomDirection: 'in',
      },
      {
        id: 's7_p3',
        captionHi: 'कुएं के मुंह पर रखा भारी काला पत्थर, जिस पर खून से उकेरे गए थे तांत्रिक कील और मंत्र',
        zoomDirection: 'out',
      },
    ],
    lines: [
      {
        text: 'अधमरी रुक्मिणी को घसीटते हुए हवेली के पीछे उस प्राचीन सूखे कुएं के पास लाया गया।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 1,
        durationSec: 7.0,
        imagePrompt:
          'two shadowy men dragging half-dead bloodstained bride Rukmini across overgrown misty backyard courtyard toward an ancient stone dry well',
      },
      {
        text: 'आसमान में पूरा चाँद बादलों के पीछे छिपा था, मानो वह भी इस नृशंस पाप को देखने से कांप रहा हो।',
        direction: 'top',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 8.5,
        durationSec: 7.0,
        imagePrompt:
          'pale cold full moon hiding behind dark storm clouds directly above crumbling stone archway and dry well at midnight',
      },
      {
        text: 'बिना किसी दया के, उन्होंने रुक्मिणी के लहूलुहान शरीर को उस साठ फीट गहरे सूखे कुएं में धकेल दिया।',
        direction: 'center',
        style: 'jolt',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene7_well_drop',
        timeOffsetSec: 16,
        durationSec: 7.5,
        imagePrompt:
          'dramatic top-down angle looking down a deep 60-foot dark stone dry well shaft as a woman in torn red saree falls into blackness',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: (कुएं की गहराई से आती भारी, थरथराती आवाज़) "तुमने मेरे साथ धोखा किया... मेरी मांग का सिंदूर छीना..."',
        direction: 'bottom',
        style: 'red',
        photoIndex: 1,
        voice: 'rukmini',
        soundCue: 'scene7_gasp_whisper',
        timeOffsetSec: 24,
        durationSec: 8.0,
        imagePrompt:
          'chilling view looking up from the pitch-black bottom of a damp stone well shaft with glowing vengeful red eyes staring skyward',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: "मैं लौटूँगी! हर अमावस्या को लौटूँगी! जब तक इस हवेली के एक-एक इंसान की नस-नस से खून नहीं निचोड़ लूँगी, मेरी रूह को शांति नहीं मिलेगी!"',
        direction: 'center',
        style: 'jolt-red-giant',
        photoIndex: 1,
        voice: 'rukmini',
        timeOffsetSec: 32.5,
        durationSec: 8.0,
        imagePrompt:
          'terrifying crimson supernatural aura and ghostly red mist swirling up out of the ancient stone courtyard well screaming vengeance',
      },
      {
        text: 'घबराए ठाकुर और तांत्रिक ने तुरंत कुएं के मुंह पर एक विशाल भारी पत्थर रख दिया और उसे कीलों से सील कर दिया।',
        direction: 'left',
        style: 'normal',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 41,
        durationSec: 6.5,
        imagePrompt:
          'panicked Thakur and Tantrik sliding a massive heavy black stone slab etched with blood runes and iron nails to seal the courtyard well shut',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "पर पत्थर पत्थरों को रोक सकता है बेटा... किसी निर्दोष के खूनी श्राप को कोई तांत्रिक कील नहीं रोक सकती।"',
        direction: 'right',
        style: 'shake',
        photoIndex: 2,
        voice: 'watchman',
        timeOffsetSec: 48,
        durationSec: 6.5,
        imagePrompt:
          'cracks glowing faintly red beneath the heavy sealed stone well lid in the dark courtyard as blood-curdling curse lingers in mist',
      },
    ],
  },

  // ==========================================================================
  // SCENE 8: 65 seconds (9 beats)
  // ==========================================================================
  {
    sceneNumber: 8,
    durationSec: 65,
    timeRangeLabel: '6:35–7:40',
    titleHi: 'सीन 8: अमावस्या का नरसंहार',
    subtitleHi: 'कुएं का पत्थर चकनाचूर, उल्टे पैरों से सीढ़ियाँ चढ़ती रक्त-पिशाचिनी और पूरे परिवार का अंत',
    soundSummaryHi: 'कुएं के भारी पत्थर के फटने का धमाका, बर्फीली हवा का बवंडर, हवेली की सीढ़ियों पर भारी पायल की छन-छन और दरवाज़े पीटने की आवाज़',
    photos: [
      {
        id: 's8_p1',
        captionHi: 'अमावस्या की आधी रात: कुएं का भारी सीलबंद पत्थर टुकड़े-टुकड़े होकर हवा में उड़ा, बाहर निकलता घना काला धुआँ',
        zoomDirection: 'in',
      },
      {
        id: 's8_p2',
        captionHi: 'अँधेरे में हवेली की घुमावदार लकड़ी की सीढ़ियों पर उल्टे मुड़े पैरों वाली सफ़ेद आँखों की भयानक परछाईं',
        zoomDirection: 'in',
      },
      {
        id: 's8_p3',
        captionHi: 'हवेली का मुख्य हॉल: बिखरा हुआ खून, ठाकुर की टूटी हुई देह और दीवारों पर खरोंचों के निशान',
        zoomDirection: 'out',
      },
    ],
    lines: [
      {
        text: 'ठीक एक महीने बाद आई पहली काली अमावस्या। हवेली में सब जश्न मना रहे थे कि वे बच गए।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 1,
        durationSec: 6.5,
        imagePrompt:
          'moonless pitch-black Amavasya night inside grand Thakur Haveli dining hall lit by golden chandeliers as Thakur family feasts',
      },
      {
        text: 'आधी रात के ठीक बारह बजे, ज़मीन कांपी और हवेली के पीछे वह भारी कुएं का पत्थर धमाके के साथ चकनाचूर हो गया!',
        direction: 'top',
        style: 'lightning',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene8_stone_shatter_wind',
        timeOffsetSec: 8,
        durationSec: 7.0,
        imagePrompt:
          'explosive shockwave shattering the heavy sealed stone slab over the courtyard well into flying jagged shards at midnight',
      },
      {
        text: 'कुएं से बर्फ जैसी ठंडी हवा और काला धुआँ निकला... और उसके साथ निकली रक्त-पिशाचिनी रुक्मिणी!',
        direction: 'center',
        style: 'jolt-red-giant',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 15.5,
        durationSec: 7.0,
        imagePrompt:
          'freezing black spectral smoke and swirling frost erupting from shattered well as terrifying demoness Rakt Pishachini Rukmini rises',
      },
      {
        text: 'उल्टे मुड़े पैर, 90 डिग्री पर टूटी गर्दन, जली हुई लाल बनारसी साड़ी और आँखों की जगह दो दहकते हुए शोले।',
        direction: 'left',
        style: 'red',
        photoIndex: 1,
        voice: 'narrator',
        timeOffsetSec: 23,
        durationSec: 7.0,
        imagePrompt:
          'terrifying female ghost Rukmini with reverse-twisted backward feet, 90-degree snapped neck, burnt red bridal saree and blazing crimson eyes',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "सन्नाटे में सीढ़ियों पर सिर्फ पायल की गूंज आ रही थी... छन... छन... छन... हर छन के साथ किसी का गला घुटता था।"',
        direction: 'right',
        style: 'shake',
        photoIndex: 1,
        voice: 'watchman',
        soundCue: 'scene8_stairs_payal_doors',
        timeOffsetSec: 30.5,
        durationSec: 7.5,
        imagePrompt:
          'grand carved wooden Haveli staircase in pitch darkness with ghostly silver anklets stepping upward casting demonic elongated shadow',
      },
      {
        text: 'पहले पति का कमरा... बंद दरवाज़े अपने आप टूटकर गिरे। पति की चीख सिर्फ दो सेकंड गूंजी और फिर सन्नाटा छा गया।',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 1,
        voice: 'narrator',
        timeOffsetSec: 38.5,
        durationSec: 7.0,
        imagePrompt:
          'splintered heavy wooden bedroom door blown inward off its hinges into dark haunted bedchamber with shadowy claw marks on floor',
      },
      {
        text: 'फिर ठाकुर अमरेंद्र सिंह... उसने अपनी बंदूक से छह गोलियां दागीं, पर गोलियां उस साए के सीने के पार निकल गईं।',
        direction: 'left',
        style: 'jolt',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 46,
        durationSec: 6.5,
        imagePrompt:
          'terrified Thakur Amarendra Singh firing an antique revolver inside dark manor hall while bullets pass harmlessly through smoky ghost Rukmini',
      },
      {
        speaker: 'ठाकुर',
        text: 'ठाकुर: "मुझे माफ़ कर दो रुक्मिणी! सब सोना तुम्हारा है... मुझे बख्श दो!"',
        direction: 'center',
        style: 'shake',
        photoIndex: 2,
        voice: 'thakur',
        timeOffsetSec: 53,
        durationSec: 5.5,
        imagePrompt:
          'broken Thakur falling to his knees begging mercy amidst scattered gold coins as glowing-eyed vengeful ghost looms directly over him',
      },
      {
        text: 'अगली सुबह हवेली में एक भी इंसान जिंदा नहीं मिला। सिर्फ दीवार पर खून से लिखा था—"यह हवेली अब मेरी है।"',
        direction: 'bottom',
        style: 'jolt-red-giant',
        photoIndex: 2,
        voice: 'narrator',
        timeOffsetSec: 59,
        durationSec: 5.5,
        imagePrompt:
          'cracked blood-stained stone hall wall inside abandoned Thakur Haveli with chilling Hindi blood writing glowing faintly in morning mist',
      },
    ],
  },

  // ==========================================================================
  // SCENE 9: 65 seconds (9 beats)
  // ==========================================================================
  {
    sceneNumber: 9,
    durationSec: 65,
    timeRangeLabel: '7:40–8:45',
    titleHi: 'सीन 9: चार शापित निशानियाँ और मुक्ति का मार्ग',
    subtitleHi: 'टूटी चूड़ियाँ, सिंदूर, पायल और लाल चुनरी—इन्हें ढूंढकर उसी कुएं में भस्म करना होगा',
    soundSummaryHi: 'चौकीदार की लालटेन की धीमी लौ, उदास रहस्यमयी धुन, चारों पवित्र वस्तुओं के अलग-अलग दिव्य धातु की झंकार',
    photos: [
      {
        id: 's9_p1',
        captionHi: 'चौकीदार चारों दोस्तों को लालटेन की रोशनी में हवेली का गुप्त नक्शा समझाता हुआ',
        zoomDirection: 'in',
      },
      {
        id: 's9_p2',
        captionHi: 'हवेली के अलग-अलग कमरों में बिखरी चारों शापित निशानियाँ: चूड़ियाँ, सिंदूर, पायल और लाल चुनरी',
        zoomDirection: 'in',
      },
      {
        id: 's9_p3',
        captionHi: 'पीछे का सूखा कुआँ, जिसमें जल रही है नीली पवित्र अग्नि—शाप मुक्ति का एकमात्र स्थान',
        zoomDirection: 'out',
      },
    ],
    lines: [
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "तुम चारों अब इस हवेली के दायरे में आ चुके हो। अब पीछे मुड़ने का रास्ता बंद हो चुका है।"',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 0,
        voice: 'watchman',
        soundCue: 'scene9_lantern_sad_music',
        timeOffsetSec: 1,
        durationSec: 7.0,
        imagePrompt:
          'four frightened Indian friends huddled around old watchman Baba lantern inside gloomy stone foyer of Thakur Haveli as outer mist closes',
      },
      {
        speaker: 'राहुल',
        text: 'राहुल: "बाबा, क्या कोई रास्ता नहीं है यहाँ से जिंदा निकलने का? हम कुछ भी करने को तैयार हैं!"',
        direction: 'left',
        style: 'shake',
        photoIndex: 0,
        voice: 'rahul',
        timeOffsetSec: 8.5,
        durationSec: 6.5,
        imagePrompt:
          'desperate young Indian man Rahul gripping watchman shoulder in warm lantern glow pleading for a way to survive the night',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "एक ही रास्ता है... रुक्मिणी की आत्मा इस हवेली में चार शापित चीज़ों से बंधी हुई है।"',
        direction: 'right',
        style: 'red',
        photoIndex: 1,
        voice: 'watchman',
        soundCue: 'scene9_four_relic_chimes',
        timeOffsetSec: 15.5,
        durationSec: 7.0,
        imagePrompt:
          'mystical dark vision of four glowing cursed Indian bridal relics floating in red mist inside haunted mansion floorplan',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "पहली: उत्तरी दुल्हन कक्ष में उसकी टूटी चूड़ियाँ। दूसरी: दक्षिणी पूजा मंडप में उसकी सिंदूर की डिब्बी।"',
        direction: 'left',
        style: 'normal',
        photoIndex: 1,
        voice: 'watchman',
        timeOffsetSec: 23,
        durationSec: 7.5,
        imagePrompt:
          'broken red bridal glass bangles in dusty dark bedroom and antique brass vermilion sindoor box glowing eerily on abandoned temple altar',
        chunkImagePrompts: [
          'broken crimson bridal glass bangles scattered on dusty wooden vanity inside dark northern bridal chamber',
          'antique tarnished brass sindoor vermilion box glowing faintly crimson on dark southern puja mandap altar',
        ],
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "तीसरी: पश्चिमी गुप्त तहखाने में उसकी खूनी पायल। और चौथी: पूर्वी गलियारे में उसकी जली हुई लाल चुनरी।"',
        direction: 'right',
        style: 'normal',
        photoIndex: 1,
        voice: 'watchman',
        timeOffsetSec: 31,
        durationSec: 7.5,
        imagePrompt:
          'bloodstained silver bridal ankle bell payal in dark dungeon and charred crimson bridal veil chunari hanging in cobwebbed eastern hallway',
        chunkImagePrompts: [
          'bloodstained silver bridal ankle bells payal resting on cold dungeon stone floor in dark western basement',
          'burnt tattered crimson bridal chunari veil hanging amid cobwebs and broken frames in dark eastern Haveli corridor',
        ],
      },
      {
        speaker: 'अमन',
        text: 'अमन: "और जब ये चारों मिल जाएँगी, तब क्या करना होगा?"',
        direction: 'bottom',
        style: 'normal',
        photoIndex: 2,
        voice: 'aman',
        timeOffsetSec: 39,
        durationSec: 6.0,
        imagePrompt:
          'young Indian man Aman looking intently at watchman aged face lit by trembling yellow lantern flame inside haunted mansion hall',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "तुम्हें चारों चीज़ों को लेकर आंगन के उसी सूखे कुएं तक पहुँचना होगा... और उन्हें पवित्र अग्नि में भस्म करना होगा।"',
        direction: 'top',
        style: 'red',
        photoIndex: 2,
        voice: 'watchman',
        timeOffsetSec: 45.5,
        durationSec: 7.0,
        imagePrompt:
          'ancient stone dry well in haunted Haveli courtyard blazing with purifying blue and orange sacred ritual flames rising into night air',
      },
      {
        speaker: 'चौकीदार',
        text: 'चौकीदार: "अगर तुमने एक भी निशानी छोड़ दी, या रुक्मिणी ने तुम्हें पहले छू लिया... तो तुम भी इसी हवेली के पिशाच बन जाओगे।"',
        direction: 'left',
        style: 'shake',
        photoIndex: 2,
        voice: 'watchman',
        timeOffsetSec: 53,
        durationSec: 6.0,
        imagePrompt:
          'terrifying ghostly red silhouette of Rakt Pishachini reaching clawed hand from corridor shadows toward fleeing victim',
      },
      {
        speaker: 'नेहा',
        text: 'नेहा: "सुनो... ऊपर की मंजिल से किसी के चलने की आवाज़ आ रही है... पायल बज रही है!"',
        direction: 'center',
        style: 'jolt',
        photoIndex: 2,
        voice: 'neha',
        timeOffsetSec: 59.5,
        durationSec: 5.0,
        imagePrompt:
          'horrified Neha staring upward toward dark upper balcony balustrade of Thakur Haveli where faint shadow moves in mist',
      },
    ],
  },

  // ==========================================================================
  // SCENE 10: 60 seconds (8 beats)
  // ==========================================================================
  {
    sceneNumber: 10,
    durationSec: 60,
    timeRangeLabel: '8:45–9:45',
    titleHi: 'सीन 10: बंद दरवाज़ा और रुक्मिणी का साया',
    subtitleHi: 'भारी फाटक का खुद-ब-खुद बंद होना, पास आती खौफनाक पायल और क्लाइमेक्स जंपस्केयर',
    soundSummaryHi: 'लोहे के भारी फाटक का प्रचंड धमाके से बंद होना, पूर्ण सन्नाटा, बहुत नज़दीक आती पायल की तेज़ छन-छन, और भयानक चीख का जंपस्केयर बूम',
    photos: [
      {
        id: 's10_p1',
        captionHi: 'चारों दोस्त हवेली के मुख्य हॉल में, पीछे लोहे का भारी फाटक अपने आप बंद होकर सील होता हुआ',
        zoomDirection: 'in',
      },
      {
        id: 's10_p2',
        captionHi: 'अँधेरे गलियारे से सीधे कैमरे की ओर बढ़ती हुई खून से लथपथ रुक्मिणी की खौफनाक आकृति',
        zoomDirection: 'in',
      },
      {
        id: 's10_p3',
        captionHi: 'पूरी स्क्रीन पर रुक्मिणी का सफेद आँखों और खुले मुंह वाला दिल दहलाने वाला जंपस्केयर चेहरा',
        zoomDirection: 'in',
      },
    ],
    lines: [
      {
        text: 'धड़ाम! एक भीषण आवाज़ के साथ हवेली का मुख्य लोहे का दरवाज़ा अपने आप बंद हो गया और उस पर भारी ताले लग गए!',
        direction: 'center',
        style: 'jolt-red-giant',
        photoIndex: 0,
        voice: 'narrator',
        soundCue: 'scene10_gate_slam_silence',
        timeOffsetSec: 1,
        durationSec: 7.0,
        imagePrompt:
          'massive iron-bound wooden main doors of Thakur Haveli slamming violently shut as heavy rusted chains and padlocks snap locked magically',
      },
      {
        speaker: 'राहुल',
        text: 'राहुल: "दरवाज़ा खोलो! कोई बाहर से खोलो! यह बाहर से बंद हो गया है!"',
        direction: 'left',
        style: 'shake',
        photoIndex: 0,
        voice: 'rahul',
        timeOffsetSec: 8.5,
        durationSec: 6.5,
        imagePrompt:
          'panicked Rahul pounding desperately on the locked massive iron Haveli main door with trembling hands in dim corridor',
      },
      {
        text: 'अचानक हॉल की सारी मोमबत्तियां एक साथ बुझ गईं। चारों तरफ गहरा घुप्प अंधेरा छा गया।',
        direction: 'top',
        style: 'fade-blur',
        photoIndex: 0,
        voice: 'narrator',
        timeOffsetSec: 15.5,
        durationSec: 6.5,
        imagePrompt:
          'dozens of wax candles inside grand mansion hall blowing out simultaneously leaving trails of white smoke in sudden pitch blackness',
      },
      {
        text: 'उस सन्नाटे में... बहुत करीब से... किसी के नंगे पैरों की भारी आहट सुनाई दी।',
        direction: 'bottom',
        style: 'red',
        photoIndex: 1,
        voice: 'narrator',
        soundCue: 'scene10_approaching_payal',
        timeOffsetSec: 22.5,
        durationSec: 7.0,
        imagePrompt:
          'chilling low-angle shot of bare pale twisted feet wearing bloodstained silver payal anklets stalking forward across dark Haveli marble floor',
      },
      {
        speaker: 'नेहा',
        text: 'नेहा: (कांपती चीख) "वो... वो देखो सीढ़ियों पर! काली परछाइयों ने मुझे, राहुल और अमन को जकड़ लिया है! भागो, हमें बचाओ!"',
        direction: 'center',
        style: 'jolt',
        photoIndex: 1,
        voice: 'neha',
        timeOffsetSec: 30,
        durationSec: 7.0,
        imagePrompt:
          'terrifying black demonic shadow tendrils grabbing three screaming young Indian friends on grand staircase while protagonist backs away in horror',
      },
      {
        speaker: 'रुक्मिणी',
        text: 'रुक्मिणी: "तुम्हारे तीनों साथी अब मेरी कैद में हैं... देखते हैं तुम उन्हें बचा पाते हो या खुद मेरा शिकार बनते हो!"',
        direction: 'top',
        style: 'jolt-red-giant',
        photoIndex: 1,
        voice: 'rukmini',
        timeOffsetSec: 37.5,
        durationSec: 7.5,
        imagePrompt:
          'blood-drenched Rakt Pishachini Rukmini floating ominously down dark mansion stairs with glowing crimson eyes and outstretched claws',
      },
      {
        text: 'रुक्मिणी ने तुम्हारे तीनों दोस्तों को हवेली के अलग-अलग कमरों में बंदी बना लिया है! अब तुम्हें छुपते हुए तीनों साथियों को आजाद करना है और जिंदा बाहर निकलना है!',
        direction: 'center',
        style: 'jolt-red-giant',
        photoIndex: 2,
        voice: 'narrator',
        soundCue: 'scene10_jumpscare_boom',
        timeOffsetSec: 45.5,
        durationSec: 7.0,
        imagePrompt:
          'heart-stopping close-up jumpscare face of Rakt Pishachini Rukmini with glowing fiery eyes, tangled black hair and screaming mouth emerging from dark',
      },
      {
        text: 'खेल शुरू होता है — अपने 3 साथियों को बचाओ!',
        direction: 'center',
        style: 'blackout-final',
        photoIndex: 2,
        voice: 'narrator',
        soundCue: 'scene10_cut_silence',
        timeOffsetSec: 53,
        durationSec: 6.5,
        imagePrompt:
          'first-person flashlight beam shining down a long terrifying haunted corridor inside Thakur Haveli with three iron cage silhouettes in distance',
      },
    ],
  },
];

export function splitIntoShortSentenceChunks(
  rawText: string,
  maxWords = 14,
): string[] {
  const cleaned = rawText
    .replace(/^[^:]+:\s*/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/["""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const effectiveMaxWords = Math.max(maxWords, 13);

  // Split strictly on full sentence boundaries (।, !, ?, \n, or single period not inside '...').
  // Never split on commas (',') or ellipses ('...', '…') so phrases like
  // "यार, ये रास्ता इतना शांत क्यों है?" and "अरे नहीं... गाड़ी का बोनट उबल रहा है!" stay whole.
  const rawSentences = cleaned
    .split(/(?<=[।!?])\s+|(?<!\.)\.(?!\.)\s*|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^[।.,!?…—\-]+$/u.test(s));

  const conjunctions = new Set([
    'और',
    'पर',
    'कि',
    'तो',
    'लेकिन',
    'तभी',
    'जहाँ',
    'जब',
    'फिर',
    'क्योंकि',
    'बल्कि',
    'ताकि',
    'या',
    'मानो',
    'चाहे',
    'अगर',
    'अचानक',
    'जैसे',
    'जिससे',
    'and',
    'but',
    'while',
    'until',
    'before',
    'as',
  ]);

  const countWords = (s: string): number => s.split(/\s+/u).filter(Boolean).length;

  // Only split sentences that exceed effectiveMaxWords, and never leave halves < 4 words.
  const initialChunks: string[] = [];
  for (const sentence of rawSentences) {
    const words = sentence.split(/\s+/u).filter(Boolean);
    if (words.length <= effectiveMaxWords) {
      initialChunks.push(words.join(' '));
      continue;
    }

    // Try natural clause boundaries (, / — / ...) only inside oversized sentences
    const subClauses = sentence
      .split(/\s*(?:—|,)\s*/u)
      .map((s) => s.trim())
      .filter(Boolean);

    if (subClauses.length > 1) {
      let buffer = '';
      for (const clause of subClauses) {
        const candidate = buffer ? `${buffer}, ${clause}` : clause;
        if (buffer && countWords(candidate) > effectiveMaxWords && countWords(buffer) >= 4) {
          initialChunks.push(buffer);
          buffer = clause;
        } else {
          buffer = candidate;
        }
      }
      if (buffer) initialChunks.push(buffer);
      continue;
    }

    let start = 0;
    while (start < words.length) {
      if (words.length - start <= effectiveMaxWords) {
        initialChunks.push(words.slice(start).join(' '));
        break;
      }

      let splitIdx = -1;
      const minSplit = start + 4;
      const maxSplit = Math.min(words.length - 4, start + effectiveMaxWords);
      for (let i = maxSplit; i >= minSplit; i--) {
        const cleanWord = words[i].replace(/[।.!?,;—]/g, '').toLowerCase();
        if (conjunctions.has(cleanWord)) {
          splitIdx = i;
          break;
        }
      }

      if (splitIdx === -1) {
        splitIdx = Math.min(words.length - 4, start + Math.min(effectiveMaxWords, 10));
      }

      if (splitIdx <= start) {
        initialChunks.push(words.slice(start).join(' '));
        break;
      }

      initialChunks.push(words.slice(start, splitIdx).join(' '));
      start = splitIdx;
    }
  }

  // Merge any short 1-3 word fragment (like "बाबा!", "अरे नहीं...", "चलो,", "वो...")
  // into its adjacent sentence so every spoken/displayed chunk is a natural full sentence.
  const merged: string[] = [];
  for (let i = 0; i < initialChunks.length; i++) {
    const cur = initialChunks[i].trim();
    if (!cur) continue;
    if (countWords(cur) <= 3) {
      if (i + 1 < initialChunks.length) {
        initialChunks[i + 1] = `${cur} ${initialChunks[i + 1]}`;
        continue;
      } else if (merged.length > 0) {
        merged[merged.length - 1] = `${merged[merged.length - 1]} ${cur}`;
        continue;
      }
    }
    merged.push(cur);
  }

  return merged.filter((c) => c.length > 0);
}

export const LOCAL_STORY_ART_IDS = [
  'art-friends-car',
  'art-red-bride-road',
  'art-scene-1',
  'art-watchman-closeup',
  'art-scene-2',
  'art-bride-rukmini-1992',
  'art-poison-milk',
  'art-scene-3',
  'art-chains-ritual',
  'art-scene-4',
  'art-well-inside',
  'art-friends-trapped-hall',
  'art-scene-5',
] as const;

export type ProceduralSceneId =
  | 'highway_headlights_fog'
  | 'dashboard_gps_lost'
  | 'driver_rahul_talking'
  | 'aman_fog_talking'
  | 'road_bride_headlights'
  | 'empty_road_skidmarks'
  | 'suv_engine_smoke'
  | 'haveli_iron_gate_storm'
  | 'haveli_nameplate_rain'
  | 'watchman_gate_pan_reveal'
  | 'friends_pleading_bars'
  | 'watchman_lantern_rain'
  | 'haveli_blood_lightning'
  | 'dark_corridor_lamps'
  | 'watchman_eyes_1992_fire'
  | 'purnima_blood_moon'
  | 'wedding_1992_mandap_diyas'
  | 'doli_courtyard_crows'
  | 'shehnai_courtyard_lamps'
  | 'withered_tulsi_dusk'
  | 'bride_rukmini_diyas'
  | 'broken_shehnai_floor'
  | 'bride_shadow_conspiracy'
  | 'basement_vault_torches'
  | 'tantrik_thakur_conspiracy'
  | 'bridal_room_flowers'
  | 'poisoned_milk_bedroom'
  | 'poison_milk_swirl'
  | 'tantrik_bedroom_chains'
  | 'spilled_milk_floor'
  | 'tantrik_blue_havan_fire'
  | 'chains_bangles_altar'
  | 'dagger_vault_blood'
  | 'well_moonlight_drop'
  | 'well_abyss_glowing_eyes'
  | 'well_stone_slab_seal'
  | 'well_shatter_smoke'
  | 'stairs_shadow_white_eyes'
  | 'splintered_door_claw'
  | 'thakur_revolver_ghost'
  | 'blood_wall_writing'
  | 'watchman_briefing_friends'
  | 'four_relics_ritual'
  | 'relic_bangles_chamber'
  | 'relic_sindoor_altar'
  | 'relic_payal_crypt'
  | 'relic_chunari_corridor'
  | 'well_purifying_fire'
  | 'friends_trapped_hall'
  | 'candles_blown_blackout'
  | 'anklet_feet_hallway'
  | 'rukmini_climax_stalk'
  | 'corridor_flashlight_cages';

export interface ResolvedOfflineStoryVisual {
  artId: string;
  proceduralSceneId: ProceduralSceneId;
  artBlend: number; // 0 = pure procedural cinematic composition, 0.72-1.0 = composited with local keyframe art
  caption: string;
  beatOverlay: string;
  cacheKey: string;
}

export function resolveOfflineStoryVisual(
  sceneIdx: number,
  beatIdx: number,
  chunkText: string,
  chunkIdx: number,
): ResolvedOfflineStoryVisual {
  const norm = chunkText
    .toLowerCase()
    .replace(/\u093C/g, '')
    .replace(/\u0901/g, '\u0902');

  const key = `s${sceneIdx}_b${beatIdx}_c${chunkIdx}`;

  // =========================================================================
  // SCENE 1: Stormy Kali Ghati Highway & Ghost in Headlights
  // =========================================================================
  if (sceneIdx === 0) {
    if (beatIdx === 1) {
      // Chunk 0 ("चारों दोस्त शहर लौट रहे थे।") stays on wide SUV interior shot;
      // Chunk 1+ ("जीपीएस कब का बंद हो चुका था...") zooms onto the dashboard with glass reflection
      if (chunkIdx >= 1 || norm.includes('जीपीएस') || norm.includes('मोबाइल नेटवर्क')) {
        return {
          artId: 'art-friends-car',
          proceduralSceneId: 'dashboard_gps_lost',
          artBlend: 1.0,
          caption: 'काली घाटी — जीपीएस और मोबाइल नेटवर्क बंद',
          beatOverlay: 'rain_lightning',
          cacheKey: `${key}_gps`,
        };
      }
      return {
        artId: 'art-friends-car',
        proceduralSceneId: 'highway_headlights_fog',
        artBlend: 1.0,
        caption: 'काली घाटी की तूफ़ानी सड़क पर चार दोस्त',
        beatOverlay: 'car_wipers_rain',
        cacheKey: `${key}_car_wide`,
      };
    }
    if (beatIdx === 2 || norm.includes('राहुल') || norm.includes('कोई दूसरी गाड़ी')) {
      return {
        artId: 'art-friends-car',
        proceduralSceneId: 'driver_rahul_talking',
        artBlend: 1.0,
        caption: 'स्टीयरिंग पर घबराया ड्राइवर राहुल और बारिश से भीगा शीशा',
        beatOverlay: 'car_wipers_rain',
        cacheKey: `${key}_driver_rahul`,
      };
    }
    if (beatIdx === 3 || norm.includes('अमन') || norm.includes('बाईपास') || norm.includes('काला कोहरा')) {
      return {
        artId: 'art-friends-car',
        proceduralSceneId: 'aman_fog_talking',
        artBlend: 1.0,
        caption: 'विंडशील्ड के बाहर काला कोहरा देख सहमा अमन',
        beatOverlay: 'rain_lightning',
        cacheKey: `${key}_aman_fog`,
      };
    }
    if (beatIdx === 4 || beatIdx === 5 || norm.includes('लाल कपड़ों') || norm.includes('गाड़ी रोको') || norm.includes('ठीक बीचों')) {
      return {
        artId: 'art-red-bride-road',
        proceduralSceneId: 'road_bride_headlights',
        artBlend: 1.0,
        caption:
          beatIdx === 5
            ? 'नेहा की चीख — हेडलाइट्स के ठीक सामने लाल साड़ी वाली दुल्हन!'
            : 'कार की पीली हेडलाइट्स के सामने सड़क के बीच खड़ी रहस्यमयी परछाईं',
        beatOverlay: 'red_bride_headlights',
        cacheKey: `${key}_road_bride`,
      };
    }
    if (beatIdx === 6 || norm.includes('टायरों की चीख') || norm.includes('खाली सड़क')) {
      return {
        artId: 'art-red-bride-road',
        proceduralSceneId: 'empty_road_skidmarks',
        artBlend: 1.0,
        caption: 'भीगी सुनसान सड़क पर टायरों के निशान — परछाईं गायब!',
        beatOverlay: 'rain_lightning',
        cacheKey: `${key}_empty_road`,
      };
    }
    if (beatIdx === 7 || norm.includes('बोनट उबल') || norm.includes('इंजन बंद')) {
      return {
        artId: 'art-scene-1',
        proceduralSceneId: 'suv_engine_smoke',
        artBlend: 1.0,
        caption: 'इंजन से उठता धुआँ और हवेली के बाहर फँसी एसयूवी',
        beatOverlay: 'engine_smoke_haveli',
        cacheKey: `${key}_suv_smoke`,
      };
    }
    return {
      artId: 'art-friends-car',
      proceduralSceneId: 'highway_headlights_fog',
      artBlend: 1.0,
      caption: 'काली घाटी की तूफ़ानी सड़क पर घने कोहरे को चीरती हेडलाइट्स',
      beatOverlay: 'car_wipers_rain',
      cacheKey: `${key}_highway`,
    };
  }

  // =========================================================================
  // SCENE 2: Haveli Iron Gate & Watchman Baba Warning
  // =========================================================================
  if (sceneIdx === 1) {
    if (beatIdx === 0) {
      return {
        artId: 'art-scene-1',
        proceduralSceneId: 'haveli_iron_gate_storm',
        artBlend: 1.0,
        caption: 'बिजली की चमक में ठाकुर हवेली की ऊँची मीनारें और काला फाटक',
        beatOverlay: 'rain_lightning',
        cacheKey: `${key}_gate_storm`,
      };
    }
    if (beatIdx === 1 || norm.includes('1884') || norm.includes('बोर्ड')) {
      return {
        artId: 'art-scene-1',
        proceduralSceneId: 'haveli_nameplate_rain',
        artBlend: 1.0,
        caption: 'जंग लगा बोर्ड — ठाकुर अमरेंद्र सिंह हवेली, निर्माण 1884',
        beatOverlay: 'rain_lightning',
        cacheKey: `${key}_nameplate`,
      };
    }
    if (beatIdx === 2) {
      return {
        artId: 'art-scene-1',
        proceduralSceneId: 'watchman_gate_pan_reveal',
        artBlend: 1.0,
        caption: 'बरामदे के पास हिलती पीली लालटेन की रोशनी और चौकीदार का साया',
        beatOverlay: 'watchman_lantern_glow',
        cacheKey: `${key}_gate_lantern_pan`,
      };
    }
    if (beatIdx === 3 || beatIdx === 4) {
      return {
        artId: 'art-watchman-closeup',
        proceduralSceneId: 'watchman_lantern_rain',
        artBlend: 1.0,
        caption: 'लोहे के फाटक पर लालटेन लिए बूढ़े चौकीदार बाबा की चेतावनी',
        beatOverlay: 'watchman_lantern_glow',
        cacheKey: `${key}_watchman_warn`,
      };
    }
    if (beatIdx === 5) {
      if (norm.includes('छत के नीचे') || norm.includes('खड़े रहने')) {
        return {
          artId: 'art-scene-1',
          proceduralSceneId: 'friends_pleading_bars',
          artBlend: 1.0,
          caption: 'बारिश में भीगते चारों दोस्त लोहे के फाटक से शरण मांगते हुए',
          beatOverlay: 'rain_lightning',
          cacheKey: `${key}_plead_bars`,
        };
      }
      return {
        artId: 'art-friends-car',
        proceduralSceneId: 'suv_engine_smoke',
        artBlend: 1.0,
        caption: 'खराब पड़ी गाड़ी के पास तूफ़ान में भीगते चारों दोस्त',
        beatOverlay: 'rain_lightning',
        cacheKey: `${key}_friends_suv_rain`,
      };
    }
    if (beatIdx === 6) {
      if (norm.includes('दीवारों के भीतर') || norm.includes('सांस ले रही') || norm.includes('नहीं बचोगे')) {
        return {
          artId: 'art-scene-1',
          proceduralSceneId: 'haveli_blood_lightning',
          artBlend: 1.0,
          caption: 'खूनी बिजली के नीचे साँस लेती शापित ठाकुर हवेली',
          beatOverlay: 'rain_lightning',
          cacheKey: `${key}_haveli_walls`,
        };
      }
      return {
        artId: 'art-watchman-closeup',
        proceduralSceneId: 'watchman_lantern_rain',
        artBlend: 1.0,
        caption: 'तूफ़ानी हवा में कांपते चौकीदार बाबा और लालटेन',
        beatOverlay: 'watchman_lantern_glow',
        cacheKey: `${key}_watchman_point`,
      };
    }
    if (norm.includes('अगली सुबह') || norm.includes('सूरज नहीं देखा') || norm.includes('रात में आया')) {
      return {
        artId: 'art-friends-trapped-hall',
        proceduralSceneId: 'dark_corridor_lamps',
        artBlend: 1.0,
        caption: 'अँधेरे गलियारे में टिमटिमाते दीये और मंडराती परछाइयाँ',
        beatOverlay: 'smoking_blown_diyas',
        cacheKey: `${key}_dark_corridor`,
      };
    }
    return {
      artId: 'art-scene-1',
      proceduralSceneId: 'haveli_blood_lightning',
      artBlend: 1.0,
      caption: 'तीस साल से खून की प्यासी ठाकुर हवेली',
      beatOverlay: 'rain_lightning',
      cacheKey: `${key}_blood_haveli`,
    };
  }

  // =========================================================================
  // SCENE 3: 1992 Flashback — Courtyard Palki & Bride Rukmini
  // =========================================================================
  if (sceneIdx === 2) {
    if (beatIdx === 0) {
      return {
        artId: 'art-watchman-closeup',
        proceduralSceneId: norm.includes('1992') ? 'watchman_eyes_1992_fire' : 'watchman_lantern_rain',
        artBlend: 1.0,
        caption: 'चौकीदार की भयाक्रांत आँखों में तैरती 1992 की यादें',
        beatOverlay: 'watchman_lantern_glow',
        cacheKey: `${key}_watchman_eyes`,
      };
    }
    if (beatIdx === 1) {
      return {
        artId: 'art-scene-2',
        proceduralSceneId:
          norm.includes('छोटे बेटे') || norm.includes('शादी इसी हवेली')
            ? 'wedding_1992_mandap_diyas'
            : 'purnima_blood_moon',
        artBlend: 1.0,
        caption: '1992 की फागुन पूर्णिमा — ठाकुर हवेली में शादी की रात',
        beatOverlay: 'fire_embers_rise',
        cacheKey: `${key}_1992_mandap`,
      };
    }
    if (beatIdx === 2) {
      if (norm.includes('फूलों की डोली') || norm.includes('पालकी') || norm.includes('आंगन में उतरी')) {
        return {
          artId: 'art-scene-2',
          proceduralSceneId: 'doli_courtyard_crows',
          artBlend: 1.0,
          caption: '1992 के आँगन में उतरती फूलों से सजी दुल्हन की पालकी',
          beatOverlay: 'fire_embers_rise',
          cacheKey: `${key}_palki_only`,
        };
      }
      if (norm.includes('शहनाई बज रही')) {
        return {
          artId: 'art-scene-2',
          proceduralSceneId: 'shehnai_courtyard_lamps',
          artBlend: 1.0,
          caption: 'सुनहरे दीयों के बीच गूंजती पुरानी शहनाई और बुझती लौ',
          beatOverlay: 'smoking_blown_diyas',
          cacheKey: `${key}_shehnai_lamps`,
        };
      }
      return {
        artId: 'art-bride-rukmini-1992',
        proceduralSceneId: 'bride_rukmini_diyas',
        artBlend: 1.0,
        caption: 'लाल बनारसी जोड़े में मासूम दुल्हन रुक्मिणी',
        beatOverlay: 'smoking_blown_diyas',
        cacheKey: `${key}_bride_rukmini`,
      };
    }
    if (beatIdx === 3 || beatIdx === 4) {
      return {
        artId: 'art-scene-2',
        proceduralSceneId: beatIdx === 3 ? 'withered_tulsi_dusk' : 'doli_courtyard_crows',
        artBlend: 1.0,
        caption: '1992 की शादी की रात आँगन में मंडराते अपशकुन',
        beatOverlay: 'smoking_blown_diyas',
        cacheKey: `${key}_tulsi_crows`,
      };
    }
    if (beatIdx === 5) {
      return {
        artId: 'art-chains-ritual',
        proceduralSceneId: 'broken_shehnai_floor',
        artBlend: 1.0,
        caption: 'फर्श पर टूटी शहनाई और अनिष्ट का साया',
        beatOverlay: 'smoking_blown_diyas',
        cacheKey: `${key}_broken_shehnai`,
      };
    }
    if (beatIdx === 6) {
      return {
        artId: 'art-bride-rukmini-1992',
        proceduralSceneId: 'bride_rukmini_diyas',
        artBlend: 1.0,
        caption: 'घूंघट में घबराई दुल्हन रुक्मिणी और बुझते दीये',
        beatOverlay: 'smoking_blown_diyas',
        cacheKey: `${key}_rukmini_scared`,
      };
    }
    return {
      artId: 'art-chains-ritual',
      proceduralSceneId: 'bride_shadow_conspiracy',
      artBlend: 1.0,
      caption: 'खंभों के पीछे खूनी सौदे की लंबी काली परछाइयाँ',
      beatOverlay: 'smoking_blown_diyas',
      cacheKey: `${key}_conspiracy`,
    };
  }

  // =========================================================================
  // SCENE 4: Basement Vault, Tantrik Kalbhairav & Thakur Greed
  // =========================================================================
  if (sceneIdx === 3) {
    if (beatIdx <= 1 || beatIdx === 3 || beatIdx === 4) {
      return {
        artId: 'art-scene-3',
        proceduralSceneId: beatIdx <= 1 ? 'basement_vault_torches' : 'tantrik_thakur_conspiracy',
        artBlend: 1.0,
        caption: 'तहखाने में तांत्रिक कालभैरव और अमावस्या बलि का षड्यंत्र',
        beatOverlay: 'havan_flames_burst',
        cacheKey: `${key}_tantrik_demand`,
      };
    }
    return {
      artId: 'art-chains-ritual',
      proceduralSceneId: 'tantrik_thakur_conspiracy',
      artBlend: 1.0,
      caption: 'मशालों की रोशनी में लोभी ठाकुर और अघोरी तांत्रिक का षड्यंत्र',
      beatOverlay: 'fire_embers_rise',
      cacheKey: `${key}_thakur_plot`,
    };
  }

  // =========================================================================
  // SCENE 5: Bridal Chamber Betrayal & Poisoned Saffron Milk
  // =========================================================================
  if (sceneIdx === 4) {
    if (beatIdx === 0 || beatIdx === 5) {
      return {
        artId: 'art-bride-rukmini-1992',
        proceduralSceneId: beatIdx === 0 ? 'bridal_room_flowers' : 'poisoned_milk_bedroom',
        artBlend: 1.0,
        caption: 'सुहागरात के कक्ष में असहाय दुल्हन रुक्मिणी',
        beatOverlay: 'smoking_blown_diyas',
        cacheKey: `${key}_bridal_room`,
      };
    }
    if (beatIdx === 4) {
      return {
        artId: 'art-chains-ritual',
        proceduralSceneId: 'tantrik_bedroom_chains',
        artBlend: 1.0,
        caption: 'लोहे की ज़ंजीरें और कफ़न लिए कमरे में घुसता तांत्रिक',
        beatOverlay: 'bangles_shatter_sparks',
        cacheKey: `${key}_tantrik_chains`,
      };
    }
    return {
      artId: 'art-poison-milk',
      proceduralSceneId:
        beatIdx === 2
          ? 'poison_milk_swirl'
          : beatIdx === 6
            ? 'spilled_milk_floor'
            : 'poisoned_milk_bedroom',
      artBlend: 1.0,
      caption: 'कपटी पति दुल्हन को विषैला केसर दूध देते हुए',
      beatOverlay: 'poison_dizzy_wave',
      cacheKey: `${key}_poison_cup`,
    };
  }

  // =========================================================================
  // SCENE 6: Blue-Black Havan Ritual & Bloody Sacrifice
  // =========================================================================
  if (sceneIdx === 5) {
    if (beatIdx === 2 || beatIdx === 3 || beatIdx === 6) {
      return {
        artId: 'art-chains-ritual',
        proceduralSceneId: 'chains_bangles_altar',
        artBlend: 1.0,
        caption: 'लोहे की कीलों, टूटी चूड़ियों और मंत्रों के बीच तांत्रिक अनुष्ठान',
        beatOverlay: 'bangles_shatter_sparks',
        cacheKey: `${key}_chains_ritual`,
      };
    }
    return {
      artId: 'art-scene-3',
      proceduralSceneId: beatIdx === 7 ? 'dagger_vault_blood' : 'tantrik_blue_havan_fire',
      artBlend: 1.0,
      caption: 'नर-कंकालों के हवन कुंड से भड़कती सर्द नीली-काली अग्नि',
      beatOverlay: 'havan_flames_burst',
      cacheKey: `${key}_blue_havan`,
    };
  }

  // =========================================================================
  // SCENE 7: Dry Well Curse & Sealing Stone Slab
  // =========================================================================
  if (sceneIdx === 6) {
    if (beatIdx === 3 || beatIdx === 4) {
      return {
        artId: 'art-scene-5',
        proceduralSceneId: 'well_abyss_glowing_eyes',
        artBlend: 1.0,
        caption: 'गहरे अँधेरे कुएं की तलहटी से दहकती लाल आँखें और प्रतिशोध की कसम',
        beatOverlay: 'well_red_vortex',
        cacheKey: `${key}_well_eyes`,
      };
    }
    return {
      artId: 'art-well-inside',
      proceduralSceneId: beatIdx <= 2 ? 'well_moonlight_drop' : 'well_stone_slab_seal',
      artBlend: 1.0,
      caption: 'साठ फीट गहरे सूखे कुएं और भारी पत्थर की शिला का खौफनाक अभिशाप',
      beatOverlay: 'well_red_vortex',
      cacheKey: `${key}_well_seal`,
    };
  }

  // =========================================================================
  // SCENE 8: Amavasya Massacre — Stone Shatters & Rakt Pishachini Rises
  // =========================================================================
  if (sceneIdx === 7) {
    if (beatIdx <= 2) {
      return {
        artId: 'art-well-inside',
        proceduralSceneId: 'well_shatter_smoke',
        artBlend: 1.0,
        caption: 'अमावस्या की रात चकनाचूर होता कुएं का पत्थर और उठता काला धुआँ',
        beatOverlay: 'well_red_vortex',
        cacheKey: `${key}_well_shatter`,
      };
    }
    if (beatIdx === 5) {
      return {
        artId: 'art-friends-trapped-hall',
        proceduralSceneId: 'splintered_door_claw',
        artBlend: 1.0,
        caption: 'टूटे हुए बंद दरवाज़े और कमरे में गूंजता सन्नाटा',
        beatOverlay: 'gate_slam_sparks',
        cacheKey: `${key}_splintered_door`,
      };
    }
    return {
      artId: 'art-scene-5',
      proceduralSceneId:
        beatIdx <= 4
          ? 'stairs_shadow_white_eyes'
          : beatIdx <= 7
            ? 'thakur_revolver_ghost'
            : 'blood_wall_writing',
      artBlend: 1.0,
      caption: 'हवेली की सीढ़ियों पर रक्त-पिशाचिनी रुक्मिणी का खूनी प्रतिशोध',
      beatOverlay: 'smoking_blown_diyas',
      cacheKey: `${key}_stairs_shadow`,
    };
  }

  // =========================================================================
  // SCENE 9: The 4 Cursed Relics & Path to Liberation
  // =========================================================================
  if (sceneIdx === 8) {
    if (beatIdx === 0 || beatIdx === 1 || beatIdx === 5) {
      return {
        artId: 'art-watchman-closeup',
        proceduralSceneId: 'watchman_briefing_friends',
        artBlend: 1.0,
        caption: 'लालटेन की रोशनी में चारों दोस्तों को मुक्ति का मार्ग समझाते चौकीदार',
        beatOverlay: 'watchman_lantern_glow',
        cacheKey: `${key}_watchman_brief`,
      };
    }
    if (beatIdx === 2 || beatIdx === 3 || beatIdx === 4) {
      const procId: ProceduralSceneId =
        beatIdx === 2
          ? 'four_relics_ritual'
          : beatIdx === 3
            ? norm.includes('सिंदूर') || norm.includes('पूजा मंडप')
              ? 'relic_sindoor_altar'
              : 'relic_bangles_chamber'
            : norm.includes('चुनरी') || norm.includes('पूर्वी गलियारे')
              ? 'relic_chunari_corridor'
              : 'relic_payal_crypt';
      return {
        artId: 'art-scene-4',
        proceduralSceneId: procId,
        artBlend: 1.0,
        caption: 'रुक्मिणी की आत्मा से जुड़ी चार शापित निशानियाँ',
        beatOverlay: 'four_relics_spotlight',
        cacheKey: `${key}_four_relics`,
      };
    }
    if (beatIdx === 6) {
      return {
        artId: 'art-scene-3',
        proceduralSceneId: 'well_purifying_fire',
        artBlend: 1.0,
        caption: 'सूखे कुएं की पवित्र अग्नि में चारों शापित वस्तुओं का भस्म होना',
        beatOverlay: 'havan_flames_burst',
        cacheKey: `${key}_well_fire`,
      };
    }
    if (beatIdx === 8) {
      return {
        artId: 'art-scene-5',
        proceduralSceneId: 'stairs_shadow_white_eyes',
        artBlend: 1.0,
        caption: 'ऊपरी मंजिल से आती पायल की गूंज और हिलती परछाईं',
        beatOverlay: 'payal_blood_glow',
        cacheKey: `${key}_upper_payal`,
      };
    }
    return {
      artId: 'art-chains-ritual',
      proceduralSceneId: 'four_relics_ritual',
      artBlend: 1.0,
      caption: 'शापित बंधन और बचने का एकमात्र उपाय',
      beatOverlay: 'four_relics_spotlight',
      cacheKey: `${key}_relic_warn`,
    };
  }

  // =========================================================================
  // SCENE 10: Doors Slam Shut, Stalking Payal & Climax
  // =========================================================================
  if (beatIdx === 0 || beatIdx === 1 || beatIdx === 2) {
    return {
      artId: 'art-friends-trapped-hall',
      proceduralSceneId: beatIdx === 2 ? 'candles_blown_blackout' : 'friends_trapped_hall',
      artBlend: 1.0,
      caption: 'धड़ाम से बंद हुआ लोहे का मुख्य दरवाज़ा — हवेली में कैद चार दोस्त',
      beatOverlay: beatIdx === 2 ? 'smoking_blown_diyas' : 'gate_slam_sparks',
      cacheKey: `${key}_gate_slam`,
    };
  }
  if (beatIdx === 3 || beatIdx === 6) {
    return {
      artId: 'art-scene-5',
      proceduralSceneId: beatIdx === 3 ? 'anklet_feet_hallway' : 'rukmini_climax_stalk',
      artBlend: 1.0,
      caption:
        beatIdx === 3
          ? 'सन्नाटे में पास आती उल्टे नंगे पैरों की पायल — छन... छन...'
          : 'रक्त-पिशाचिनी रुक्मिणी का खौफनाक हमला!',
      beatOverlay: beatIdx === 3 ? 'payal_blood_glow' : 'climax_jumpscare',
      cacheKey: `${key}_climax_scare`,
    };
  }
  if (beatIdx === 4 || beatIdx === 5) {
    return {
      artId: 'art-friends-trapped-hall',
      proceduralSceneId: 'rukmini_climax_stalk',
      artBlend: 1.0,
      caption: 'तीनों साथियों को बंधक बनाती रक्त-पिशाचिनी रुक्मिणी',
      beatOverlay: 'payal_blood_glow',
      cacheKey: `${key}_friends_captured`,
    };
  }
  return {
    artId: 'art-friends-trapped-hall',
    proceduralSceneId: 'corridor_flashlight_cages',
    artBlend: 1.0,
    caption: 'टॉर्च की रोशनी में अँधेरा गलियारा — अपने 3 साथियों को बचाओ!',
    beatOverlay: 'payal_blood_glow',
    cacheKey: `${key}_game_start`,
  };
}

export const TOTAL_STORY_DURATION_SEC = VN_STORY_SCENES.reduce(
  (sum, s) => sum + s.durationSec,
  0,
); // Exactly 585 seconds (9m 45s)

export const STORY_CHAPTERS: Record<LanguageCode, StoryChapter[]> = {
  hi: VN_STORY_SCENES.map((s) => ({
    title: s.titleHi,
    text: s.lines.map((l) => l.text).join(' '),
    durationLabel: s.timeRangeLabel,
    img: '',
  })),
  en: VN_STORY_SCENES.map((s) => ({
    title: s.titleHi,
    text: s.lines.map((l) => l.text).join(' '),
    durationLabel: s.timeRangeLabel,
    img: '',
  })),
};

export const QUICK_CHAT_MESSAGES: Record<LanguageCode, string[]> = {
  hi: [
    'भाई, चाबी और शापित वस्तु इस कमरे में मिली!',
    'बच के रहना, पायल की छन-छन आवाज़ पास आ रही है!',
    'मुझे पिंजरे से बचाओ! रुक्मिणी इधर आ रही है!',
    'चलो सब लोग आंगन के सूखे कुएं के पास मिलो।',
  ],
  en: [
    'Bro, found a cursed relic in this chamber!',
    'Watch out, her ankle bells are getting closer!',
    'Save me from the cage! Rukmini heard us!',
    'Everyone meet at the courtyard well to burn the relics.',
  ],
};

export interface CinematicSceneSpec {
  id: 'scene1' | 'scene2' | 'scene3';
  number: number;
  titleHi: string;
  titleEn: string;
  prompt: string;
  narrationHi: string;
  narrationEn: string;
}

export const CINEMATIC_SCENES: CinematicSceneSpec[] = [
  {
    id: 'scene1',
    number: 1,
    titleHi: 'सीन 1: हवेली के बाहर बारिश और कार का रुकना (Cinematic Intro)',
    titleEn:
      'Scene 1: Thunderstorm & Stalled Car Outside Thakur Haveli (Cinematic Intro)',
    prompt:
      "Cinematic 3D animation, dark horror style, heavy thunderstorm at midnight outside a decaying haunted Indian mansion named 'Thakur Haveli'. An old vintage car stalls in front of the massive iron gates, headlights flickering, terrifying eerie atmosphere, Unreal Engine 5 render, highly detailed, 4k.",
    narrationHi:
      'साल 1992, आधी रात का भयानक तूफान। ठाकुर हवेली के विशाल लोहे के फाटक के ठीक सामने पुरानी कार अचानक बंद हो जाती है और उसकी हेडलाइट्स झिलमिलाने लगती हैं।',
    narrationEn:
      'Midnight, 1992. Amid a violent thunderstorm outside the decaying Thakur Haveli, the vintage car stalls before the massive iron gates as its headlights flicker into the darkness.',
  },
  {
    id: 'scene2',
    number: 2,
    titleHi: 'सीन 2: रुक्मिणी (रक्त-पिशाचिनी) का खौफनाक लुक (Jumpscare Animation)',
    titleEn: 'Scene 2: Rukmini — The Blood Witch (Jumpscare Animation)',
    prompt:
      'Horror 3D character animation, a terrifying female ghost with reverse-twisted legs, burnt red traditional Indian bridal saree, long messy hair covering face, 90-degree snapped neck, walking slowly in a dark corridor with rusty ankle bells making echoing sounds, glowing red eyes, cinematic lighting, ultra-realistic horror.',
    narrationHi:
      'अंधेरे गलियारे में जंग लगी पायल की छन-छन गूंजती है। उल्टे मुड़े पैर, जली हुई लाल बनारसी साड़ी, 90 डिग्री टूटी गर्दन और दहकती लाल आंखों के साथ रक्त-पिशाचिनी रुक्मिणी धीरे-धीरे आगे बढ़ रही है!',
    narrationEn:
      'Rusty ankle bells echo down the dark corridor. With reverse-twisted legs, a burnt red bridal saree, a 90-degree snapped neck, and glowing crimson eyes, Rukmini stalks through the shadows!',
  },
  {
    id: 'scene3',
    number: 3,
    titleHi: 'सीन 3: सूखे कुएं का रहस्य और जलती हुई चिता (Climax Scene)',
    titleEn: 'Scene 3: Mystery of the Dry Well & Burning Pyre (Climax Scene)',
    prompt:
      '3D dark fantasy animation, inside a spooky courtyard of an abandoned mansion, a deep ancient stone dry well with mystical blue and red flames rising from inside, shadowy smoke figures, suspenseful atmospheric horror, photorealistic, cinematic camera panning.',
    narrationHi:
      'वीरान हवेली के आंगन में प्राचीन पत्थर के सूखे कुएं के भीतर से रहस्यमयी नीली और लाल लपटें उठ रही हैं। धुएं की काली आकृतियां हवा में मंडरा रही हैं—यहीं चारों शापित वस्तुएं भस्म करनी होंगी!',
    narrationEn:
      'Inside the spooky courtyard of the abandoned mansion, mystical blue and crimson flames rise from the ancient stone dry well surrounded by shadowy smoke figures—incinerate the 4 cursed relics here to break the curse!',
  },
];

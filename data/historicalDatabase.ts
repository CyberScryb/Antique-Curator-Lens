import { HistoricalRecord } from '../types';

export const historicalDatabase: HistoricalRecord[] = [
  {
    id: 'db_001',
    category: 'Horology',
    name: 'Rolex Cosmograph Daytona "Paul Newman" (Ref. 6239)',
    era: '1960s',
    origin: 'Geneva, Switzerland',
    historicalSignificance: 'Achieved legendary status primarily due to its association with actor and race car driver Paul Newman. The "exotic" dial was initially unpopular, leading to low production numbers, which paradoxically ensures its extreme rarity and desirability today.',
    marketTrend: 'Bullish',
    estimatedValueRange: '$250,000 - $1,500,000+',
    rarityIndicators: [
      'Original exotic "step" dial with block markers in sub-dials',
      'Art Deco style font on subdials',
      'Stainless steel bezel with tachymeter scale engraved to 300 units/hour'
    ],
    keyCharacteristics: [
      'Contrasting outer seconds track',
      'Square lollipops on sub-dial hash marks',
      'Valjoux 722 manual-wind movement'
    ],
    forgeryMarkers: [
      'Incorrect font kerning on the word "ROLEX"',
      'Sub-dials printed flat rather than slightly recessed (step dial)',
      'Modern luminous material (Luminova) instead of correct period tritium (resulting in wrong UV reaction)'
    ]
  },
  {
    id: 'db_002',
    category: 'Ceramics',
    name: 'Ming Dynasty Blue & White Porcelain',
    era: '1368–1644',
    origin: 'Jingdezhen, China',
    historicalSignificance: 'Marks the pinnacle of Chinese porcelain manufacturing and export. The cobalt blue pigment, initially imported from Persia, combined with pristine white clay (kaolin) created a globally desired luxury good that spurred the global maritime trade network.',
    marketTrend: 'Stable',
    estimatedValueRange: '$10,000 - $5,000,000+',
    rarityIndicators: [
      'Imperial provenance (reign marks of Xuande or Chenghua periods)',
      'Unbroken glaze with deep, mottled cobalt blue "heaping and piling" effect',
      'Large scale uncracked vessels (e.g., massive dragon jars)'
    ],
    keyCharacteristics: [
      'Smooth, unctuous glaze feeling slightly softer than later Qing pieces',
      'Cobalt blue decoration under a transparent glaze',
      'Base often features an unglazed foot ring showing fine, white porcelain body (sometimes with iron-rust firing spots)'
    ],
    forgeryMarkers: [
      '"Heaping and piling" effect painted on rather than naturally occurring during firing',
      'Chemically aged glaze (acid-washed, killing the natural subtle luster)',
      'Base foot ring precision-cut by machine rather than hand-finished'
    ]
  },
  {
    id: 'db_003',
    category: 'Furniture',
    name: 'Chippendale Mahogany Desk',
    era: '1750–1780',
    origin: 'London, England & American Colonies (Philadelphia/Boston)',
    historicalSignificance: 'Based on designs by Thomas Chippendale, combining Gothic, Rococo, and Chinese elements. The piece symbolizes the peak of 18th-century cabinetry craft and the wealth of the mercantile class in Britain and Colonial America.',
    marketTrend: 'Bearish',
    estimatedValueRange: '$3,000 - $50,000',
    rarityIndicators: [
      'Original brass hardware (batwing or willow brasses)',
      'Intricate, unbroken fretwork and carving',
      'Documented maker (e.g., Thomas Affleck, John Townsend)'
    ],
    keyCharacteristics: [
      'Dense, high-quality imported mahogany (often San Domingo mahogany)',
      'Cabriole legs terminating in ball-and-claw or ogee bracket feet',
      'Hand-cut dovetail joints on drawers with chamfered bottom boards'
    ],
    forgeryMarkers: [
      'Circular saw marks on secondary woods (indicates post-1840 construction)',
      'Perfectly symmetrical hand-carvings (originals have slight human variations)',
      'Phillips head screws or uniform wire nails used in hidden structural blocks'
    ]
  },
  {
    id: 'db_004',
    category: 'Numismatics',
    name: '1909-S VDB Lincoln Cent',
    era: '1909',
    origin: 'San Francisco, USA',
    historicalSignificance: 'The first year of the Lincoln Cent, designed by Victor David Brenner (VDB). Public outcry over his prominent initials at the base of the reverse caused their removal mid-year. The San Francisco mint produced very few before the change.',
    marketTrend: 'Stable',
    estimatedValueRange: '$800 - $100,000+',
    rarityIndicators: [
      'Deep, uncirculated red color (RD grading)',
      'Clear, un-polished "S" mint mark',
      'Crisp V.D.B. initials on the reverse bottom'
    ],
    keyCharacteristics: [
      'Wheat ears reverse',
      'High relief portrait of Lincoln',
      'Mintage of exactly 484,000'
    ],
    forgeryMarkers: [
      'Added "S" mint mark to a standard Philadelphia 1909 VDB (look for seam lines/tool marks)',
      'Altered "S" mint marks taking the wrong shape (the genuine S has specific serif angles)',
      'Artificial recoloring to simulate "Red" uncirculated condition'
    ]
  },
  {
    id: 'db_005',
    category: 'Fine Art',
    name: 'Ukiyo-e Woodblock Print (Katsushika Hokusai)',
    era: 'Edo Period (approx 1830s)',
    origin: 'Japan',
    historicalSignificance: 'Ukiyo-e ("pictures of the floating world") heavily influenced Western modern art (Japonisme), specifically Impressionists like Monet and Van Gogh. Hokusai\'s "Thirty-Six Views of Mount Fuji" is the pinnacle of the genre.',
    marketTrend: 'Bullish',
    estimatedValueRange: '$15,000 - $1,500,000+',
    rarityIndicators: [
      'First printing (early impressions show woodgrain patterns - "baren" marks)',
      'Vivid, non-faded Prussian blue and natural pigments',
      'Complete set of publisher seals and censors\' marks'
    ],
    keyCharacteristics: [
      'Fine, unbroken key-block outlines',
      'Printed on soft, absorbent mulberry paper (Washi)',
      'Distinctive color registrations aligning perfectly with outlines'
    ],
    forgeryMarkers: [
      'Offset lithography dots visible under magnification',
      'Synthetic dyes that fluoresce heavily under UV light',
      'Incorrect paper type lacking natural long fibers of genuine Edo-period Washi'
    ]
  },
  {
    id: 'db_006',
    category: 'Jewelry',
    name: 'Art Deco Diamond & Platinum Geometry Ring',
    era: '1920–1935',
    origin: 'Paris, France (Cartier, Boucheron)',
    historicalSignificance: 'A rejection of the flowing curves of Art Nouveau, embracing industrial geometry, speed, and modern precision. Introduced new gemstone cuts (baguette, emerald cut) and pioneered the extensive use of platinum.',
    marketTrend: 'Bullish',
    estimatedValueRange: '$5,000 - $250,000',
    rarityIndicators: [
      'Signed by a premier maison (Cartier, Van Cleef & Arpels)',
      'Calibre-cut colored gemstones (sapphires, rubies) fitted perfectly against diamonds without visible metal',
      'Original milgrain edging retaining its sharpness'
    ],
    keyCharacteristics: [
      'Symmetrical, architectural lines',
      'Old European or early brilliant cut center diamonds',
      'Intricate, hand-pierced openwork in the platinum gallery'
    ],
    forgeryMarkers: [
      'Cast construction instead of hand-fabricated (look for porous metal surfaces under a loupe)',
      'Modern brilliant-cut diamonds used throughout',
      'Laser-engraved maker\'s marks (originals were hand-stamped)'
    ]
  },
  {
    id: 'db_007',
    category: 'Toys / Memorabilia',
    name: 'Action Comics #1',
    era: 'June 1938',
    origin: 'United States',
    historicalSignificance: 'The debut of Superman and the ushering in of the superhero genre. Widely considered the holy grail of comic book collecting, launching the "Golden Age" of comics.',
    marketTrend: 'Bullish',
    estimatedValueRange: '$500,000 - $6,000,000+',
    rarityIndicators: [
      'High CGC Universal Grade (Unrestored)',
      'White/off-white page quality',
      'Firmly attached original staples'
    ],
    keyCharacteristics: [
      '68 pages, 10-cent cover price',
      'Pulp paper interior with four-color printing process',
      'Cover art by Joe Shuster'
    ],
    forgeryMarkers: [
      'Micro-trimming of edges (results in slightly smaller dimensions than standard 7 3/4" x 10 1/2")',
      'Color touch-ups using modern markers that bleed or react to UV/blacklight',
      'Missing or replaced centerfolds from subsequent reprints'
    ]
  },
  {
    id: 'db_008',
    category: 'Automobilia',
    name: 'Ferrari 250 GTO',
    era: '1962–1964',
    origin: 'Maranello, Italy',
    historicalSignificance: 'The ultimate expression of the Ferrari 250 series, dominating motorsport while retaining street-legal status. Only 36 units were produced, making it the most exclusive and valuable collector car globally.',
    marketTrend: 'Stable',
    estimatedValueRange: '$40,000,000 - $70,000,000+',
    rarityIndicators: [
      'Matching numbers (original chassis, engine, and gearbox)',
      'Documented period racing history (Le Mans, Targa Florio)',
      'Unmodified Scaglietti hand-beaten aluminum bodywork'
    ],
    keyCharacteristics: [
      '3.0 L Tipo 168/62 Comp. V12 engine',
      'Gated 5-speed manual dog-leg transmission',
      'Distinctive triple D-shaped front radiator cooling intakes'
    ],
    forgeryMarkers: [
      'Re-bodied Ferrari 250 GTEs lacking proper chassis reinforcement and provenance',
      'Modern TIG-welded tube chassis tubes instead of period-correct gas/arc welding',
      'Discrepancies in the "Red Book" Ferrari Classiche certification or fabricated history files'
    ]
  }
];

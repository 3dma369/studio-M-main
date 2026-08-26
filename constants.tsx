
import { Product, Program, SubscriptionTier, ServiceOffering, TeamMember, TimelineEvent, FeaturedMember } from './types';

export const STUDIO_APPS = [
  {
    id: 'toyverse',
    title: 'Toy Verse HQ',
    description: 'Toys, 3D prints, STL files, dioramas, games, history, videos and social media for collectors.',
    image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&q=80&w=800',
    url: 'https://toyverse-app.web.app/',
    icon: '🧸',
    gradient: 'from-blue-900 to-purple-900',
    tags: ['3D Prints', 'STL Files', 'Dioramas', 'Collectibles', 'Games', 'Social Media'],
    color: 'primary'
  },
  {
    id: 'vibex',
    title: 'Vibe X',
    description: 'Music, DJs, events, live streaming, artist exposure and merch shopping.',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800',
    url: 'https://vibe-x-app.web.app/',
    icon: '🎵',
    gradient: 'from-purple-900 to-pink-900',
    tags: ['Music', 'DJs', 'Events', 'Live Stream', 'Artist Platform', 'Merch'],
    color: 'secondary'
  },
  {
    id: 'dp-park',
    title: 'DP Park',
    description: '3D park experiences, virtual tours, and immersive digital environments.',
    image: 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?auto=format&fit=crop&q=80&w=800',
    url: 'https://dp-park-main.vercel.app/',
    icon: '🎢',
    gradient: 'from-green-800 to-teal-900',
    tags: ['3D Parks', 'Virtual Tours', 'Immersive', 'Digital Experience'],
    color: 'green-600'
  },
  {
    id: 'savvyprice',
    title: 'Savvy Price',
    description: 'Find the treasure anywhere — price discovery, inventory management and collector insights.',
    image: 'https://images.unsplash.com/photo-1610368620902-e5e3c3a9e5f4?auto=format&fit=crop&q=80&w=800',
    url: 'https://price-n-inventory.vercel.app/',
    icon: '💎',
    gradient: 'from-amber-600 to-orange-700',
    tags: ['Pricing', 'Inventory', 'Collectors', 'Insights', 'Discovery'],
    color: 'amber-600'
  }
];

export const CHANNELS = [
  {
    name: 'YouTube',
    handle: '@3volution_tv',
    url: 'https://www.youtube.com/@3volution_tv',
    icon: 'play_circle',
    color: 'red-500'
  },
  {
    name: 'Odysee',
    handle: '@3volution-TV',
    url: 'https://odysee.com/@3volution-TV:a',
    icon: 'live_tv',
    color: 'amber-500'
  }
];

export const PROGRAMS: Program[] = [
  {
    id: 'dating',
    title: 'DATE ME <3 I DATE YOU',
    description: 'A high-stakes dating show exploring the modern dilemma: love or a mystery prize?',
    image: 'https://images.unsplash.com/photo-1511733331976-290371e8c0a9?auto=format&fit=crop&q=80&w=800',
    category: 'Reality',
    videoUrl: 'https://youtube.com/watch?v=sample1',
    platform: 'YouTube',
    summary: 'Molina Studio\'s flagship reality experience where contestants must decide if their connection is worth more than a luxury mystery box. Filmed live in San Francisco.',
    credits: [
      { name: 'Eric A. Molina Denegri', role: 'Executive Producer' },
      { name: 'Sarah Chen', role: 'Casting Director' },
      { name: 'Jordan Vane', role: 'Host', link: 'https://instagram.com/jordan' }
    ],
    episodes: [
      { id: 'ep1', title: 'The Golden Gate Gamble', duration: '42m', thumbnail: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=400', summary: 'Three bachelors compete for a date on a yacht.' },
      { id: 'ep2', title: 'Rooftop Regrets', duration: '38m', thumbnail: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=400', summary: 'A high-stakes rooftop dinner ends in a shock.' }
    ],
    reviews: [
      { id: 'r1', userName: 'RealityWatcher', rating: 5, comment: 'Best dating show in SF right now!', date: '2024-09-12' }
    ]
  },
  {
    id: 'toys',
    title: 'TOY VERSES',
    description: 'Diving deep into collectibles, 3D printing, and the artistry of miniature worlds.',
    image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&q=80&w=800',
    category: 'Hobbies',
    videoUrl: 'https://odysee.com/sample2',
    platform: 'Odysee',
    summary: 'An exploration of the craftsmanship behind modern collectibles. From resin printing to hand-painting masterpieces.',
    credits: [
      { name: 'David Lee', role: 'Technical Director' },
      { name: 'Marcus Thorne', role: 'Lead Artist' }
    ],
    episodes: [
      { id: 't-ep1', title: 'The Resin Revolution', duration: '25m', thumbnail: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&q=80&w=400', summary: 'Testing the new 8K printers for ultra-detail.' }
    ],
    reviews: [
      { id: 'r2', userName: 'PrintMaster', rating: 4, comment: 'Great tips for my dioramas.', date: '2024-10-01' }
    ]
  },
  {
    id: 'food',
    title: 'TRY BAY AREA',
    description: 'Discovering the hidden culinary gems of San Francisco and the wider Bay Area.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
    category: 'Lifestyle',
    videoUrl: 'https://youtube.com/watch?v=sample3',
    platform: 'YouTube',
    summary: 'A culinary journey through the diverse neighborhoods of the Bay Area, highlighting small businesses and world-class chefs.',
    credits: [
      { name: 'Maria Rodriguez', role: 'Production Lead' },
      { name: 'Alex Wong', role: 'Cinematographer' }
    ],
    episodes: [
      { id: 'f-ep1', title: 'Mission District Secrets', duration: '30m', thumbnail: 'https://images.unsplash.com/photo-1514516348920-f319309b5691?auto=format&fit=crop&q=80&w=400', summary: 'The best burritos you\'ve never heard of.' }
    ],
    reviews: [
      { id: 'r3', userName: 'FoodieSF', rating: 5, comment: 'Found my new favorite taco spot thanks to this!', date: '2024-10-20' }
    ]
  }
];

export const TEAM: TeamMember[] = [
  {
    name: 'Eric A. Molina Denegri',
    role: 'CEO & Creative Visionary',
    image: '/eric-portrait.jpg'
  },
  {
    name: 'Sarah Chen',
    role: 'Operations Director',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300'
  },
  {
    name: 'David Lee',
    role: 'Visual Arts Lead',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300'
  },
  {
    name: 'Maria Rodriguez',
    role: 'Head of Production',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=300'
  }
];

export const TIMELINE: TimelineEvent[] = [
  {
    year: '2018',
    title: 'The Foundation',
    description: 'Studio was founded in San Francisco with a vision to revolutionize multimedia production through the union of reality and art.'
  },
  {
    year: '2020',
    title: 'Digital Expansion',
    description: 'Launched our presence on YouTube and Odysee, pioneering collaborative content that connects humankind.'
  },
  {
    year: '2023',
    title: 'New Horizons',
    description: 'Moved to our state-of-the-art studio facility, launching "Toy Verses" and "Try Bay Area" to global acclaim.'
  }
];

export const CORE_VALUES = [
  { title: 'Collaboration', icon: 'groups', description: 'Join the T.U Studio Collective. Submit your creative vision, share your reel, and partner with our production team on the next generation of multimedia projects.' },
  { title: 'Creativity', icon: 'lightbulb', description: 'Explore our latest studio output — Toy Verses, Try Bay Area, and original productions crafted with cutting-edge tools and bold artistic direction.' },
  { title: 'Member Excellence', icon: 'stars', description: 'Honoring the monthly visionaries, partners, and fans whose contributions power the studio. Every tier shapes what we build next.' }
];

export const FEATURED_MEMBERS: FeaturedMember[] = [
  {
    id: 'm1',
    name: 'Liam Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
    tier: SubscriptionTier.CORPORATE,
    contribution: 'Strategic partner who funded our newest 4K multi-cam studio array for local artist showcases.'
  },
  {
    id: 'm2',
    name: 'Elena Rossi',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
    tier: SubscriptionTier.PRO,
    contribution: 'Masterfully edited the fan-favorite Cyberpunk Diorama time-lapse sequence for Toy Verses.'
  },
  {
    id: 'm3',
    name: 'Julian Grey',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
    tier: SubscriptionTier.MEMBER,
    contribution: 'Voted most influential community moderator for our monthly live Q&A sessions with Eric.'
  },
  {
    id: 'm4',
    name: 'Maya Sun',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100',
    tier: SubscriptionTier.FAN,
    contribution: 'Our top monthly fan donor, helping us secure a new mobile rig for Try Bay Area pop-ups.'
  },
  {
    id: 'm5',
    name: 'Oscar Wilde',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
    tier: SubscriptionTier.FREE,
    contribution: 'Incredible community advocate who shared our "Date Me" premiere with over 500 potential recruits!'
  }
];

export const PRODUCTS: Product[] = [
  // DATING SHOW ITEMS
  {
    id: 'd1',
    name: 'Molina Midnight Cologne',
    price: 85,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=400',
    description: 'Signature scent from "DATE ME <3". Bold, mysterious, unforgettable.',
    program: 'Dating',
    fullDescription: 'Crafted in collaboration with artisanal perfumers in San Francisco, Molina Midnight is a woody aromatic fragrance that captures the essence of a mysterious night in the city.',
    reviews: [{ id: 'pr1', userName: 'LoveQuest', rating: 5, comment: 'Compliments everywhere!', date: '2024-11-02' }]
  },
  {
    id: 'd2',
    name: 'The Art of Connection Course',
    price: 150,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400',
    description: 'A masterclass on communication and modern dating by Eric Molina.',
    program: 'Dating',
    fullDescription: '8 Modules of deep-dive content on understanding human psychology, reality-based communication, and finding union in relationships.'
  },
  {
    id: 'd3',
    name: 'Molina Hearts Chocolate Box',
    price: 45,
    image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&q=80&w=400',
    description: 'Artisanal SF-made chocolates for your mystery date.',
    program: 'Dating',
    fullDescription: 'A curated selection of 12 dark and milk chocolates, each themed after a classic episode of Date Me <3.'
  },
  {
    id: 'd4',
    name: 'Silk & Spice - Discreet Set',
    price: 120,
    image: 'https://images.unsplash.com/photo-1590611380053-29007f35456f?auto=format&fit=crop&q=80&w=400',
    description: 'High-end wellness and intimate accessories.',
    program: 'Dating',
    fullDescription: 'Elegantly designed intimate toys for modern couples, ensuring comfort and aesthetic pleasure.'
  },
  // TOY VERSES ITEMS
  {
    id: 't1',
    name: 'Cyberpunk Diorama STL',
    price: 25,
    image: 'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?auto=format&fit=crop&q=80&w=400',
    description: 'Highly detailed 3D print files for "TOY VERSES" fans.',
    program: 'Toys',
    fullDescription: 'Professional grade STL files for home 3D printing. Includes 15 unique pieces for a 1:12 scale scene.',
    reviews: []
  },
  {
    id: 't2',
    name: 'Limited Eric Molina 1/6 Figure',
    price: 299,
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?auto=format&fit=crop&q=80&w=400',
    description: 'Hand-painted, collector-grade figure of our studio leader.',
    program: 'Toys',
    fullDescription: 'Limited to 500 pieces. Features 30 points of articulation and studio-authentic clothing.'
  },
  {
    id: 't3',
    name: 'Toy Verses Comic #1',
    price: 15,
    image: 'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?auto=format&fit=crop&q=80&w=400',
    description: 'The origin story of the miniature multiverse.',
    program: 'Toys',
    fullDescription: 'A 32-page full-color comic exploring the hidden lives of toys in the Molina Studio multiverse.'
  },
  {
    id: 't4',
    name: 'Studio Crew Hoodie (Swag)',
    price: 65,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400',
    description: 'The official Molina Multimedia Studio uniform.',
    program: 'Toys',
    fullDescription: 'Heavyweight cotton hoodie with embroidered studio logo. Available in Jet Black and Studio Red.'
  },
  {
    id: 't5',
    name: 'Cosplay Custom Blueprint',
    price: 40,
    image: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&q=80&w=400',
    description: 'Digital patterns for the "Technomancer" cosplay.',
    program: 'Toys',
    fullDescription: 'Complete PDF blueprints for creating the iconic suit seen in our recent high-production short.'
  },
  // TRY BAY AREA ITEMS
  {
    id: 'f1',
    name: 'SF Mission District Tour',
    price: 100,
    image: 'https://images.unsplash.com/photo-1541467655365-b57759586390?auto=format&fit=crop&q=80&w=400',
    description: 'VIP Tickets for our curated SF food tour event.',
    program: 'Food',
    fullDescription: 'Join the crew for an exclusive walking tour. 5 secret locations and Q&A.',
    reviews: [{ id: 'pr2', userName: 'SF_Eats', rating: 5, comment: 'Amazing experience!', date: '2024-10-30' }]
  },
  {
    id: 'f2',
    name: '@Night Studio Gift Card',
    price: 50,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFdHgEMPIGcBnXAMgNzS43MUdoQULK0nTGk4hxPxOZZknxK35qvEG1-HjvlfKc71KBuGeMoG6udUPx5wC2JZD0zPAs6kfnpGZcQ9rN4JL_Orsq6vfcrLojsrquXwgRSkaBNo-5v4lF2_LC_jUTi4eFsKoTuuMUnIIxsKXkpjPTTf74a-Hs-jQ-8s6qc9-vWcTmHtjHLPY (GIFT CARD)',
    description: 'Valid for events, classes, and concerts.',
    program: 'Food',
    fullDescription: 'The gift of choice. Use at any Molina-approved location in San Francisco or for online courses.'
  },
  {
    id: 'f3',
    name: 'Night Concert VIP Pass',
    price: 250,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=400',
    description: 'Full access to the next Molina Studio Concert.',
    program: 'Food',
    fullDescription: 'Includes backstage access, open bar, and reserved seating for the Bay Area\'s premier multimedia concert event.'
  }
];

export const SERVICES: ServiceOffering[] = [
  {
    id: 'c1',
    title: 'Enterprise Video Production',
    description: 'Cinematic corporate storytelling for brands seeking to humanize their message.',
    features: ['4K Multi-cam Setup', 'Scriptwriting', 'AI-Enhanced Editing', 'Motion Graphics'],
    type: 'Corporate',
    icon: 'videocam'
  },
  {
    id: 'p1',
    title: 'Personal Brand Coaching',
    description: 'Work directly with Eric A. Molina Denegri to find your unique digital voice.',
    features: ['One-on-one sessions', 'Public Speaking Prep', 'Visual Identity Audit'],
    type: 'Private',
    icon: 'person'
  }
];

export const SUBSCRIPTIONS = [
  {
    tier: SubscriptionTier.FREE,
    price: '0',
    features: ['Standard Video Access', 'Public Community Chat', 'Ad-supported Viewing']
  },
  {
    tier: SubscriptionTier.FAN,
    price: '1.00 - 8.99',
    features: ['Community Supporter Badge', 'Early Access to Clips', 'Member-only Merch Drops', 'Priority Chat Reactions']
  },
  {
    tier: SubscriptionTier.MEMBER,
    price: '9.99',
    features: ['Ad-free Experience', 'Exclusive Behind-the-Scenes', 'Member-only Merch Drops', 'Monthly Studio Newsletter']
  },
  {
    tier: SubscriptionTier.PRO,
    price: '29.99',
    features: ['All Member Features', 'Voting Rights', 'Access to Raw Project Files', 'Exclusive Producer Credits']
  },
  {
    tier: SubscriptionTier.PLATINUM,
    price: '99.99',
    features: ['All Member + Pro Features', 'Lifetime Voting Rights', 'Platinum Exclusive Vault Access', 'Direct Line to Leadership', 'Annual Studio Retreat Invitation']
  },
  {
    tier: SubscriptionTier.CORPORATE,
    price: '499.99',
    features: ['Full Commercial Licensing', 'Custom Program Sponsorship', 'Private Studio Consultations', 'Executive Producer Credits']
  }
];

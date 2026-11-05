// Trusted build-time editorial records. No customer metrics or runtime fetches.
export const projects = [
  {
    "id": "bytesfx",
    "title": "BytesFX Chat & Sales",
    "kind": "owned-product",
    "summary": "A website conversation becomes a captured lead, a reviewed proposal and a tracked sales opportunity.",
    "capabilities": ["AI chat and lead capture", "Sales pipeline", "Proposals and email follow-ups"],
    "deliveryScope": ["Product design and customer-facing website", "Chat widget, dashboard and backend APIs", "Lead storage, AI and email integrations", "Production deployment and operation"],
    "repositoryUrls": ["https://github.com/jared0565/Bytes-Web"],
    "liveUrl": "https://web.bytesfx.com/ai-chatbot/#product-workflow",
    "liveActionLabel": "Explore the chatbot",
    "featuredOrder": null,
    "problem": "Businesses need to connect website enquiries with the people, decisions and follow-up work that move a sale forward.",
    "implementation": "BytesFX designed and built the complete product: the public website, embedded chat, lead dashboard, sales pipeline, backend services and integrations. Leads retain their verification status, proposals stay subject to human review, and the business records the final Won or Lost outcome.",
    "walkthrough": ["Explore chat and lead capture on the chatbot page.", "Inspect the sample pipeline, lead details and proposal screens below.", "Start a free trial to set up the workflow for your own business."],
    "note": "An owned product. Dashboard screenshots use synthetic contacts, amounts and outcomes. AI email follow-ups depend on the plan and sender setup; reply tracking requires email routing.",
    "publishState": "published",
    "caseStudyPath": "/projects/bytesfx/",
    "image": {"src": "/projects/bytesfx-pipeline.png", "alt": "BytesFX sales pipeline with synthetic sample contacts and amounts", "width": 1440, "height": 1000},
    "evidence": ["docs/superpowers/evidence/project-showcase/capabilities.md", "docs/superpowers/evidence/project-showcase/assets.md"]
  },
  {
    "id": "pivot-parlor",
    "title": "Pivot Parlor",
    "deliveryScope": ["Platform design and application development", "Shop creation and unique branded frontends", "Service, team, scheduling and booking workflows", "Backend integration and production deployment"],
    "kind": "platform",
    "summary": "A shop-creation platform with unique branded frontends, staff scheduling and online booking for salons and barbershops.",
    "capabilities": [
      "Individual shop creation",
      "Unique branded frontends",
      "Booking and staff scheduling"
    ],
    "repositoryUrls": [
      "https://github.com/fbmacagba/Pivot-Parlor"
    ],
    "liveUrl": "https://pivotparlor.com/",
    "liveActionLabel": "Explore the platform",
    "featuredOrder": 1,
    "problem": "Independent salons and barbershops need their own identity online, supported by a system for services, staff availability and customer bookings.",
    "implementation": "BytesFX built the platform that creates individual shops with their own distinct customer-facing frontends. Each shop brings its branding, services, team and booking journey together within the wider Pivot Parlor system. The work spans platform design, shop creation, frontend development, backend integration and deployment.",
    "walkthrough": [
      "Explore the platform homepage to understand shop onboarding, branded page generation and scheduling.",
      "See one generated shop below, with its own branding, services and team.",
      "Explore the shop’s sample booking flow and scripted assistant. The demonstration creates no real appointment or payment."
    ],
    "note": "The platform is the project; the linked shop is one demonstration of its output. That shop uses fictional services, prices and people, and its sample assistant uses scripted replies.",
    "imageCaption": "Pivot Parlor’s public platform homepage. See one generated shop below.",
    "publishState": "published",
    "caseStudyPath": "/projects/pivot-parlor/",
    "image": {
      "src": "/projects/pivot-platform.png",
      "alt": "Pivot Parlor platform homepage introducing branded shop creation, scheduling and booking",
      "width": 1440,
      "height": 1000
    },
    "example": {
      "title": "One shop created with the platform",
      "caption": "Ferdy’s Barber Shop is a demonstration of a generated frontend. It represents one shop within the wider platform.",
      "url": "https://pivotparlor.com/ferdyms-barber-shop-014",
      "actionLabel": "Explore the example shop",
      "image": {"src": "/projects/pivot-parlor.png", "alt": "Ferdy’s Barber Shop, one generated Pivot Parlor shop frontend", "width": 1440, "height": 1000}
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md",
      "docs/superpowers/evidence/project-showcase/pivot-platform.md"
    ]
  },
  {
    "id": "active-paw",
    "title": "Active Paw",
    "deliveryScope": ["Storefront design and Shopify theme development", "Product discovery and shopping interfaces", "PawScout backend and store integrations", "Theme and backend deployment"],
    "kind": "live-store",
    "summary": "A pet-care store brings product discovery, collections and shopping guidance together.",
    "capabilities": [
      "Product collections",
      "Storefront search",
      "Pet-care shopping journeys"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/active-paw-theme",
      "https://github.com/jared0565/pawscout-worker"
    ],
    "liveUrl": "https://activepaw.co.uk/",
    "liveActionLabel": "Visit live store",
    "featuredOrder": 2,
    "problem": "Pet owners need to find relevant products and understand their options before buying.",
    "implementation": "The Active Paw storefront and PawScout work form one store project. The public preview shows the shopping interface; it does not demonstrate supplier imports or internal automation.",
    "walkthrough": [
      "Explore pet-care collections.",
      "Search for a product and inspect its details.",
      "Read the store guidance before deciding whether to buy."
    ],
    "note": "An owned live store. Purchases are real. This example is not evidence of the BytesFX chat widget.",
    "publishState": "published",
    "caseStudyPath": "/projects/active-paw/",
    "image": {
      "src": "/projects/active-paw.png",
      "alt": "Active Paw: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md"
    ]
  },
  {
    "id": "bytesai-learning",
    "title": "BytesAI Learning",
    "deliveryScope": ["Product design and course discovery experience", "Course, provider and topic interfaces", "Learning quiz integration", "Application development and deployment"],
    "kind": "owned-product",
    "summary": "A course discovery site helps visitors explore AI learning by topic and provider.",
    "capabilities": [
      "Course discovery",
      "Provider browsing",
      "Learning quiz entry"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/bytesai-learning"
    ],
    "liveUrl": "https://learn.bytesai.uk/",
    "liveActionLabel": "Visit learning site",
    "featuredOrder": 3,
    "problem": "Learners need a manageable starting point among many AI courses and providers.",
    "implementation": "A curated learning interface brings course previews, topic navigation and a quiz entry point into a single discovery experience.",
    "walkthrough": [
      "Browse the course previews.",
      "Explore providers and categories.",
      "Open the learning quiz to explore a starting point."
    ],
    "note": "An owned product. The preview demonstrates discovery; no assistant performance or learning outcomes are claimed.",
    "publishState": "published",
    "caseStudyPath": "/projects/bytesai-learning/",
    "image": {
      "src": "/projects/bytesai-learning.png",
      "alt": "BytesAI Learning: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md"
    ]
  },
  {
    "id": "cafe-bookings",
    "title": "BytesFX Cafe & Bookings",
    "deliveryScope": ["Hospitality experience design and website", "Menu, soft-play and party interfaces", "Calendar and booking integration", "Application development and deployment"],
    "kind": "demonstration",
    "summary": "A family cafe demonstration connects the menu, soft play, parties and calendar.",
    "capabilities": [
      "Menu browsing",
      "Party information",
      "Calendar and booking interface"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/Oak-Hill"
    ],
    "liveUrl": "https://cafe.bytesfx.com/",
    "liveActionLabel": "Visit demonstration",
    "featuredOrder": null,
    "problem": "Families need to understand the food, activities and party options before making an enquiry.",
    "implementation": "A hospitality site groups the menu, soft play, party packages and calendar under one clear navigation.",
    "walkthrough": [
      "Browse the menu and soft-play information.",
      "Compare party information.",
      "Inspect the calendar and booking interface without submitting."
    ],
    "note": "A demonstration site. No booking, payment or email submission was tested.",
    "publishState": "published",
    "caseStudyPath": "/projects/cafe-bookings/",
    "image": {
      "src": "/projects/cafe-bookings.png",
      "alt": "BytesFX Cafe & Bookings: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md"
    ]
  },
  {
    "id": "file-converter",
    "title": "File Converter",
    "deliveryScope": ["Utility design and application development", "File selection and conversion workflows", "On-device saved-file library", "Production deployment"],
    "kind": "owned-product",
    "summary": "A focused utility offers document, image and data conversion from one interface.",
    "capabilities": [
      "Format selection",
      "File conversion interface",
      "On-device saved-file library"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/File-Converter"
    ],
    "liveUrl": "https://file-converter.bmorris0565.workers.dev/",
    "liveActionLabel": "Visit file converter",
    "featuredOrder": null,
    "problem": "People need a simple way to choose a file and an output format without navigating a complex tool.",
    "implementation": "The interface combines file selection, available formats and a local saved-file library. The product describes processing as on-device; this review did not perform a full data-flow audit.",
    "walkthrough": [
      "Read the supported formats and size limit.",
      "Choose a non-sensitive sample file if you want to try the tool.",
      "Review the saved-file controls and their shared-browser privacy note."
    ],
    "note": "An owned utility. Processing and privacy statements are product descriptions, not an independent security audit.",
    "publishState": "published",
    "caseStudyPath": "/projects/file-converter/",
    "image": {
      "src": "/projects/file-converter.png",
      "alt": "File Converter: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md"
    ]
  },
  {
    "id": "bytescrm",
    "title": "BytesCRM",
    "publishState": "draft",
    "kind": "owned-product"
  }
];

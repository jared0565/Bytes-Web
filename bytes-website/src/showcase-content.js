// Trusted build-time editorial records. Scope and workflows are supported by the evidence listed for each project.
export const projects = [
  {
    "id": "bytesfx",
    "title": "BytesFX Chat & Sales",
    "kind": "owned-product",
    "summary": "A business-specific chatbot, lead dashboard and sales follow-up system, from website enquiry to a reviewed proposal and recorded outcome.",
    "capabilities": [
      "Embeddable business-specific chat",
      "Lead and conversation management",
      "Reviewed proposals and email follow-up",
      "Client onboarding and administration"
    ],
    "deliveryScope": [
      "Product design, agency website and onboarding",
      "Chat widget and client/admin dashboards",
      "Chat and CRM APIs, lead data and attachment storage",
      "AI routing, email integrations and scheduled workflows",
      "Analytics, operational controls and production deployment"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/Bytes-Web"
    ],
    "liveUrl": "https://web.bytesfx.com/ai-chatbot/#product-workflow",
    "liveActionLabel": "Explore the chatbot",
    "featuredOrder": null,
    "problem": "A website enquiry is only the start. Businesses need to capture the contact, understand the work, keep the conversation together and decide what happens next.",
    "implementation": "BytesFX built the complete website-to-sales product: the public website, client onboarding, embeddable chat widget, business dashboard and connected backend services. Each business can configure its assistant and websites, capture enquiries and manage contacts through a sales pipeline. Email replies feed a qualification workflow that can prepare a brief and proposal, with the owner reviewing and sending the final proposal.",
    "walkthrough": [
      "Explore chat and lead capture on the chatbot page.",
      "Inspect the sample pipeline, lead details and proposal screens below.",
      "Start a free trial to set up the workflow for your own business."
    ],
    "note": "An owned product. Dashboard screenshots use synthetic contacts, amounts and outcomes. AI email follow-ups depend on the plan and sender setup; reply tracking requires email routing.",
    "publishState": "published",
    "caseStudyPath": "/projects/bytesfx/",
    "image": {
      "src": "/projects/bytesfx-pipeline.png",
      "alt": "BytesFX sales pipeline with synthetic sample contacts and amounts",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/capabilities.md",
      "docs/superpowers/evidence/project-showcase/assets.md"
    ],
    "sections": [
      {
        "title": "A product businesses can operate",
        "body": "The dashboard connects lead details, conversations, verification status, campaigns, proposals and Won/Lost records. Client settings govern business context, services, website access and sender configuration. The administration layer supports client setup and plan management."
      },
      {
        "title": "Automation with a human decision point",
        "body": "The sales workflow can collect additional information by email and use replies to prepare a structured brief and proposal. The business reviews the draft before sending. Follow-ups respond to replies, unsubscribe and recorded outcomes; availability depends on the plan, sender setup and reply routing."
      }
    ],
    "workflow": {
      "title": "How the system works",
      "description": "Customer conversation, sales preparation and business decisions stay connected across the website, dashboard and email.",
      "lanes": [
        {
          "title": "Capture and qualify",
          "steps": [
            {
              "title": "Website visitor",
              "body": "Chat or contact-form enquiry",
              "ownerAction": false
            },
            {
              "title": "Lead record",
              "body": "Contact details and conversation",
              "ownerAction": false
            },
            {
              "title": "Email confirmation",
              "body": "Verification status remains visible",
              "ownerAction": false
            },
            {
              "title": "Qualifying reply",
              "body": "Needs, budget and context",
              "ownerAction": false
            }
          ]
        },
        {
          "title": "Prepare and follow through",
          "steps": [
            {
              "title": "AI-assisted draft",
              "body": "Brief and proposal preparation",
              "ownerAction": false
            },
            {
              "title": "Review and send",
              "body": "The owner checks and sends the proposal",
              "ownerAction": true
            },
            {
              "title": "Follow-up",
              "body": "Reply and unsubscribe handling",
              "ownerAction": false
            },
            {
              "title": "Record outcome",
              "body": "The owner confirms Won or Lost",
              "ownerAction": true
            }
          ]
        }
      ]
    },
    "imageCaption": "Actual BytesFX dashboard. Synthetic sample data: contacts, budgets and outcomes. The board is one part of the wider chat-to-sales product."
  },
  {
    "id": "pivot-parlor",
    "title": "Pivot Parlor",
    "deliveryScope": [
      "Multi-shop product architecture and experience design",
      "AI-assisted site generation and branded frontends",
      "Customer booking, staff scheduling and queue workflows",
      "Owner/operator dashboards, POS and inventory tools",
      "Backend, payment and AI integrations; web/PWA deployment"
    ],
    "kind": "platform",
    "summary": "A multi-shop booking and business platform that generates branded shop websites and connects customer booking with owner, staff and operator tools.",
    "capabilities": [
      "Generated shop websites",
      "Booking, deposits and scheduling",
      "Owner, staff and operator workspaces",
      "POS, stock and revenue tools"
    ],
    "repositoryUrls": [
      "https://github.com/fbmacagba/Pivot-Parlor"
    ],
    "liveUrl": "https://pivotparlor.com/",
    "liveActionLabel": "Explore the platform",
    "featuredOrder": 1,
    "problem": "Independent salons and barbershops need a distinct online identity and the operational tools to manage appointments, staff, walk-ins and in-store sales.",
    "implementation": "BytesFX built Pivot Parlor as a multi-tenant web platform with separate customer, shop-owner, staff and operator experiences. Shop onboarding feeds an AI-assisted design and content workflow that produces a branded booking website for each shop. Guest booking connects services, staff and availability with optional deposits, confirmations and reminders. Behind the public sites, the platform brings scheduling, queues, point of sale, stock and revenue tools into the shop workspace.",
    "walkthrough": [
      "Explore the platform homepage to understand shop onboarding, branded page generation and scheduling.",
      "See one generated shop below, with its own branding, services and team.",
      "Explore the shop’s sample booking flow and scripted assistant. The demonstration creates no real appointment or payment."
    ],
    "note": "The public shop is a fictional demonstration of one generated frontend. Its booking walkthrough creates no real appointment or payment, and its assistant uses scripted replies.",
    "imageCaption": "Pivot Parlor’s public platform homepage. The generated shop below is one output of the wider platform.",
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
      "image": {
        "src": "/projects/pivot-parlor.png",
        "alt": "Ferdy’s Barber Shop, one generated Pivot Parlor shop frontend",
        "width": 1440,
        "height": 1000
      }
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md",
      "docs/superpowers/evidence/project-showcase/pivot-platform.md",
      "docs/superpowers/evidence/project-showcase/pivot-doc-audit.md"
    ],
    "sections": [
      {
        "title": "One platform, distinct shop experiences",
        "body": "Shop-specific branding includes copy, imagery, typography, colours and page composition. Customers explore a shop through its own frontend and book as guests. Operators manage onboarding and generation; owners manage the business; staff have a focused day-to-day workspace."
      },
      {
        "title": "Online booking and shop operations",
        "body": "The documented platform includes optional Stripe deposits, appointment handling, walk-ins, waitlists, retail stock, purchasing, stock-takes and returns. Its mobile delivery is responsive, installable web software. The public example below uses sample booking data and scripted chat; it does not create a real appointment or payment."
      }
    ],
    "workflow": {
      "title": "How the system works",
      "description": "Platform setup creates a shop-specific customer experience, connected to role-based business operations.",
      "lanes": [
        {
          "title": "Platform and shop creation",
          "steps": [
            {
              "title": "Operator onboarding",
              "body": "Configure the shop and business details",
              "ownerAction": true
            },
            {
              "title": "Design and content",
              "body": "Generate shop-specific branding and composition",
              "ownerAction": false
            },
            {
              "title": "Shop frontend",
              "body": "Publish the branded web/PWA experience",
              "ownerAction": false
            }
          ]
        },
        {
          "title": "Customer booking",
          "steps": [
            {
              "title": "Services and staff",
              "body": "Choose what to book and who with",
              "ownerAction": false
            },
            {
              "title": "Availability",
              "body": "Select an available appointment",
              "ownerAction": false
            },
            {
              "title": "Deposit if required",
              "body": "Payment integration for eligible bookings",
              "ownerAction": false
            },
            {
              "title": "Appointment",
              "body": "Confirmation and reminder workflow",
              "ownerAction": false
            }
          ]
        },
        {
          "title": "Business operations",
          "steps": [
            {
              "title": "Owner and staff",
              "body": "Manage schedules, appointments and queues",
              "ownerAction": false
            },
            {
              "title": "In-store work",
              "body": "POS, inventory and returns",
              "ownerAction": false
            },
            {
              "title": "Reporting",
              "body": "Review revenue and business activity",
              "ownerAction": true
            }
          ]
        }
      ]
    }
  },
  {
    "id": "active-paw",
    "title": "Active Paw + PawScout",
    "deliveryScope": [
      "Custom Shopify Liquid theme and responsive shopping flows",
      "Shopify App Proxy and supplier-data integration",
      "Supplier discovery, import and product-quality pipelines",
      "Merchant console, AI-assisted inbox and content tools",
      "Supervised supplier-order workflows and deployment controls"
    ],
    "kind": "live-store",
    "summary": "A customized Shopify theme and PawScout commerce automation, connecting customer demand with supplier discovery, product listings and merchant operations.",
    "capabilities": [
      "Customized Shopify shopping experience",
      "Demand-led supplier discovery and imports",
      "Pricing, availability and delivery intelligence",
      "Merchant inbox, content and order workflows"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/active-paw-theme",
      "https://github.com/jared0565/pawscout-worker"
    ],
    "liveUrl": "https://activepaw.co.uk/",
    "liveActionLabel": "Visit live store",
    "featuredOrder": 2,
    "problem": "Running a pet-care store involves more than presenting products: it needs relevant inventory, reliable product information, supplier coordination, customer support and controlled order handling.",
    "implementation": "BytesFX delivered Active Paw and PawScout as one connected commerce system. The customized Shopify Liquid theme provides product discovery, supplier-backed previews, product pages, the cart and buying guides. PawScout supplies the backend intelligence: supplier discovery, product checks, import workflows, pricing and availability information, alongside an embedded merchant console. Customer interest can move an unlisted supplier product through validation into a real Shopify listing.",
    "walkthrough": [
      "Explore product discovery and the shopping experience.",
      "Inspect product and delivery information, or read a buying guide.",
      "Use the workflow diagram to see how PawScout connects the storefront to merchant operations."
    ],
    "note": "Active Paw is a live store, so purchases are real. PawScout supports supervised operations; automatic supplier payment and active social distribution are not represented as live features here.",
    "publishState": "published",
    "caseStudyPath": "/projects/active-paw/",
    "image": {
      "src": "/projects/active-paw.png",
      "alt": "Active Paw: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md",
      "docs/superpowers/evidence/project-showcase/theme-doc-audit.md",
      "docs/superpowers/evidence/project-showcase/pawscout-doc-audit.md"
    ],
    "sections": [
      {
        "title": "The storefront and the automation layer",
        "body": "When store search needs more relevant products, PawScout can supply vetted product previews. Visitor interest can trigger an import into Shopify; the theme follows its progress until the product is available. Shopify-held data supplies availability and delivery displays. The theme also renders shoppable buying guides and remains usable as a Shopify store when optional PawScout calls fail."
      },
      {
        "title": "A merchant operating workspace",
        "body": "PawScout brings supplier records, profitability screening, product maintenance, support threads, approved-answer memory, buying-guide drafts, campaigns and affiliate administration into the merchant workflow. Replies, guide publication and campaign sending retain owner controls. Supplier orders are prepared through guarded checks; the latest documented operating mode leaves supplier payment with the owner."
      }
    ],
    "workflow": {
      "title": "How the system works",
      "description": "The custom theme, Shopify and PawScout work together. Owner actions remain visible at the operational handoffs.",
      "lanes": [
        {
          "title": "Demand to catalogue",
          "steps": [
            {
              "title": "Shopper searches",
              "body": "The custom theme presents store results",
              "ownerAction": false
            },
            {
              "title": "PawScout discovery",
              "body": "Find and validate supplier matches",
              "ownerAction": false
            },
            {
              "title": "Preview and interest",
              "body": "Inspect a supplier-backed product",
              "ownerAction": false
            },
            {
              "title": "Shopify listing",
              "body": "Import and make the product available",
              "ownerAction": false
            }
          ]
        },
        {
          "title": "Order operations",
          "steps": [
            {
              "title": "Shopify order",
              "body": "Customer checkout stays in Shopify",
              "ownerAction": false
            },
            {
              "title": "PawScout checks",
              "body": "Grace period, stock, shipping and risk gates",
              "ownerAction": false
            },
            {
              "title": "Supplier order",
              "body": "Prepare the unpaid supplier order",
              "ownerAction": false
            },
            {
              "title": "Owner funding",
              "body": "Pay the supplier and handle exceptions",
              "ownerAction": true
            }
          ]
        },
        {
          "title": "Support and content",
          "steps": [
            {
              "title": "Inbox and catalogue",
              "body": "Customer context and product information",
              "ownerAction": false
            },
            {
              "title": "AI-assisted preparation",
              "body": "Grounded replies and buying-guide drafts",
              "ownerAction": false
            },
            {
              "title": "Owner action",
              "body": "Review replies, publish guides or send campaigns",
              "ownerAction": true
            }
          ]
        }
      ]
    },
    "imageCaption": "Active Paw’s live Shopify storefront. This customer-facing theme is one layer of the combined theme and PawScout system."
  },
  {
    "id": "bytesai-learning",
    "title": "BytesAI Learning",
    "deliveryScope": [
      "Learner website, accounts and progress dashboard",
      "Course/provider data, search and recommendation workflows",
      "Administrative catalogue tools and import integrations",
      "RSS/trend intake and AI-assisted insight publishing",
      "Backend, authentication, storage and Cloudflare deployment"
    ],
    "kind": "owned-product",
    "summary": "An AI learning platform combining course discovery, recommendations and progress tools with provider imports and an editorial insights workflow.",
    "capabilities": [
      "Course search and learning paths",
      "Quiz and conversational guidance",
      "Saved courses and progress tracking",
      "Provider imports and editorial tools"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/bytesai-learning"
    ],
    "liveUrl": "https://learn.bytesai.uk/",
    "liveActionLabel": "Visit learning site",
    "featuredOrder": 3,
    "problem": "Learners need to find relevant AI courses across providers, choose a starting point and return to their learning; maintaining useful discovery also requires catalogue and editorial operations.",
    "implementation": "BytesFX built the learner experience and the operational platform behind it. Visitors can search and filter courses, explore providers and learning paths, and use quiz or conversational guidance to choose a starting point. Signed-in learners can save courses and track progress. Administration covers the course catalogue, provider discovery and batch imports, featured-course controls, analytics and AI-assisted insight generation.",
    "walkthrough": [
      "Browse the course previews.",
      "Explore providers and categories.",
      "Open the learning quiz to explore a starting point."
    ],
    "note": "An owned discovery and learning-support product. Courses are accessed through their providers; no course accreditation, guaranteed learning result or universal editorial review claim is made.",
    "publishState": "published",
    "caseStudyPath": "/projects/bytesai-learning/",
    "image": {
      "src": "/projects/bytesai-learning.png",
      "alt": "BytesAI Learning: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md",
      "docs/superpowers/evidence/project-showcase/learning-doc-audit.md"
    ],
    "sections": [
      {
        "title": "Discovery with continuity",
        "body": "Course, provider, topic and level information helps visitors compare learning options before following a provider link. Saved, started and completed states support returning learners. Quiz guidance, learning paths and the chatbot offer additional ways to find relevant material."
      },
      {
        "title": "The catalogue and editorial operation",
        "body": "Admin tools support course and provider maintenance, batch imports, ranking and analytics. A separate insights workflow takes source material through generation, classification, optional course linking and publishing controls. Editorial tools support review and regeneration; the showcase does not imply every article has mandatory human approval or a linked course."
      }
    ],
    "workflow": {
      "title": "How the system works",
      "description": "Learner discovery and the catalogue/editorial operation are connected parts of one product.",
      "lanes": [
        {
          "title": "Learner journey",
          "steps": [
            {
              "title": "Discover",
              "body": "Search courses, topics and providers",
              "ownerAction": false
            },
            {
              "title": "Choose a path",
              "body": "Quiz, learning paths or chat guidance",
              "ownerAction": false
            },
            {
              "title": "Save and start",
              "body": "Keep selections in a learner account",
              "ownerAction": false
            },
            {
              "title": "Track progress",
              "body": "Return to saved and completed courses",
              "ownerAction": false
            }
          ]
        },
        {
          "title": "Catalogue and insights",
          "steps": [
            {
              "title": "Source intake",
              "body": "Provider discovery, imports and news sources",
              "ownerAction": false
            },
            {
              "title": "Admin and AI tools",
              "body": "Maintain courses and prepare insights",
              "ownerAction": false
            },
            {
              "title": "Publishing controls",
              "body": "Classify, review or regenerate content",
              "ownerAction": false
            },
            {
              "title": "Public discovery",
              "body": "Course pages and insight articles",
              "ownerAction": false
            }
          ]
        }
      ]
    },
    "imageCaption": "The public BytesAI Learning discovery interface. Learner accounts and catalogue/editorial administration extend beyond this preview."
  },
  {
    "id": "cafe-bookings",
    "title": "BytesFX Cafe & Bookings",
    "deliveryScope": [
      "Hospitality website, menu and activity experiences",
      "Availability calendar and reusable booking engine",
      "Authenticated staff roles and operational dashboard",
      "Contacts, enquiries, reporting and newsletter tools",
      "Backend data, demo isolation and Cloudflare deployment"
    ],
    "kind": "demonstration",
    "summary": "A hospitality website and booking-operations application, with availability, staff access, contact records, reporting and newsletter controls.",
    "capabilities": [
      "Availability and booking workflows",
      "Authenticated staff administration",
      "Contacts, enquiries and reporting",
      "Newsletter and consent controls"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/Oak-Hill"
    ],
    "liveUrl": "https://cafe.bytesfx.com/",
    "liveActionLabel": "Visit demonstration",
    "featuredOrder": null,
    "problem": "A family cafe needs to connect menus, activities and party discovery with availability and booking handling, while giving staff a practical way to manage enquiries and customer records.",
    "implementation": "BytesFX built the public hospitality experience and the application behind its booking workflow. The system connects a menu, soft-play information, party packages and a public availability calendar with booking validation and staff administration. Its operational scope includes availability and closures, bookings, messages, contacts, reporting, permissions and newsletter controls. The published portfolio version wraps the reusable application in an explicit fictional demonstration.",
    "walkthrough": [
      "Browse the menu and soft-play information.",
      "Compare party information.",
      "Inspect the calendar and booking interface without submitting."
    ],
    "note": "A fictional hospitality demonstration. Public bookings, enquiries and newsletter submissions are simulated; no real booking or payment is accepted. Authenticated staff tools are separate from that public demo.",
    "publishState": "published",
    "caseStudyPath": "/projects/cafe-bookings/",
    "image": {
      "src": "/projects/cafe-bookings.png",
      "alt": "BytesFX Cafe & Bookings: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md",
      "docs/superpowers/evidence/project-showcase/cafe-doc-audit.md"
    ],
    "sections": [
      {
        "title": "Customer discovery and availability",
        "body": "Visitors can explore the sample menu, soft play and party options, then inspect availability and the booking form. The underlying workflow validates the request and handles booking state. In the public demonstration, submissions are simulated and do not create a reservation, accept payment or send email."
      },
      {
        "title": "Operations behind the public pages",
        "body": "The authenticated workspace supports availability management, booking and message handling, contact records, reports, users and activity. Newsletter tooling separates consent and owner-controlled sending from routine enquiries. Staff administration remains a real authenticated application; the public demo boundary does not turn it into an unrestricted sandbox."
      }
    ],
    "workflow": {
      "title": "How the system works",
      "description": "The reusable booking application connects public discovery to staff operations. The published visitor journey runs in demonstration mode.",
      "lanes": [
        {
          "title": "Visitor demonstration",
          "steps": [
            {
              "title": "Explore the cafe",
              "body": "Menu, soft play and party information",
              "ownerAction": false
            },
            {
              "title": "Choose availability",
              "body": "Calendar and booking form",
              "ownerAction": false
            },
            {
              "title": "Validate request",
              "body": "Check required information and slot",
              "ownerAction": false
            },
            {
              "title": "Demo reference",
              "body": "Simulated response; no real reservation",
              "ownerAction": false
            }
          ]
        },
        {
          "title": "Staff operations",
          "steps": [
            {
              "title": "Authenticated staff",
              "body": "Sign in with role-based permissions",
              "ownerAction": false
            },
            {
              "title": "Availability and bookings",
              "body": "Manage slots, closures and requests",
              "ownerAction": false
            },
            {
              "title": "Customer context",
              "body": "Contacts and enquiry history",
              "ownerAction": false
            },
            {
              "title": "Owner controls",
              "body": "Reporting and newsletter actions",
              "ownerAction": true
            }
          ]
        }
      ]
    },
    "imageCaption": "The fictional cafe’s public website. Behind this presentation is a reusable booking and staff-operations application."
  },
  {
    "id": "file-converter",
    "title": "File Converter",
    "deliveryScope": [
      "Product design and TypeScript application",
      "Document/data/image conversion adapters",
      "Safe reading views and PDF navigation",
      "IndexedDB library, save/delete and cross-tab behavior",
      "Self-hosted assets and static Cloudflare deployment"
    ],
    "kind": "owned-product",
    "summary": "A browser-local conversion, reading and saved-file workspace for documents, tables and images, with no file-upload or cloud-storage service.",
    "capabilities": [
      "Document, data and image conversion",
      "PDF and document reading views",
      "Device-local saved-file library",
      "Compatible format and resource controls"
    ],
    "repositoryUrls": [
      "https://github.com/jared0565/File-Converter"
    ],
    "liveUrl": "https://file-converter.bmorris0565.workers.dev/",
    "liveActionLabel": "Visit file converter",
    "featuredOrder": null,
    "problem": "Working with different document, data and image formats should not require separate conversion sites, readers and cloud accounts just to inspect or keep the result.",
    "implementation": "BytesFX built a browser-based workspace that combines compatible format conversion, native reading views and an explicitly saved local library. The application supports ten document, table and image formats across 44 conversion paths. Format adapters process files on-device; readers let users inspect source files and results, while downloads and a browser-local library provide separate ways to keep the output.",
    "walkthrough": [
      "Read a non-sensitive sample file or choose a compatible conversion.",
      "Inspect the result and download it.",
      "Optionally save it to the local library, reopen it and review the delete/storage controls."
    ],
    "note": "Processing and saved-file content stay in the browser. The library is shared by users of that browser profile and is not cloud backup. File, format and layout limits apply.",
    "publishState": "published",
    "caseStudyPath": "/projects/file-converter/",
    "image": {
      "src": "/projects/file-converter.png",
      "alt": "File Converter: actual public website preview",
      "width": 1440,
      "height": 1000
    },
    "evidence": [
      "docs/superpowers/evidence/project-showcase/assets.md",
      "docs/superpowers/evidence/project-showcase/converter-doc-audit.md"
    ],
    "sections": [
      {
        "title": "Convert and inspect in one workspace",
        "body": "The output selector exposes compatible targets. Readers cover PDFs, documents, plain text, tables, JSON and images, with PDF page navigation and readable document structure. Document conversion preserves text and basic structure rather than exact page layout; OCR is outside the product scope."
      },
      {
        "title": "Explicit local storage",
        "body": "Users can download results or choose Save to library. The library stores metadata and file content in IndexedDB within the current browser profile, with confirmed deletion, duplicate protection and cross-tab refresh. It is device-local storage, not cloud sync; clearing site data can remove saved files, and anyone using the same browser profile can access them."
      }
    ],
    "workflow": {
      "title": "How the system works",
      "description": "Files are processed and read on-device. Saving to the library is a separate, explicit choice.",
      "lanes": [
        {
          "title": "Convert and read",
          "steps": [
            {
              "title": "Choose a local file",
              "body": "Document, data or image input",
              "ownerAction": false
            },
            {
              "title": "Read or convert",
              "body": "Inspect the file or select a compatible format",
              "ownerAction": false
            },
            {
              "title": "Inspect the result",
              "body": "Reader view and output checks",
              "ownerAction": false
            },
            {
              "title": "Download",
              "body": "Keep an exported copy on the device",
              "ownerAction": true
            }
          ]
        },
        {
          "title": "Optional saved library",
          "steps": [
            {
              "title": "Save explicitly",
              "body": "Store the chosen result in this browser",
              "ownerAction": true
            },
            {
              "title": "Local library",
              "body": "File and metadata in IndexedDB",
              "ownerAction": false
            },
            {
              "title": "Reopen or download",
              "body": "Read the saved result later",
              "ownerAction": false
            },
            {
              "title": "Delete if needed",
              "body": "Confirm removal from the library",
              "ownerAction": true
            }
          ]
        }
      ]
    },
    "imageCaption": "File Converter’s public workspace. Conversion is accompanied by reader views and a device-local saved-file library."
  },
  {
    "id": "bytescrm",
    "title": "BytesCRM",
    "publishState": "draft",
    "kind": "owned-product"
  }
];

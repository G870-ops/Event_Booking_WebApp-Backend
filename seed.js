const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Invite = require('./models/Invite');
const Booking = require('./models/Bookings');

dotenv.config();

const users = [
    { name: 'Admin User', email: 'admin@invitor.com', password: 'password123', role: 'admin' },
    { name: 'Demo User', email: 'user@invitor.com', password: 'password123', role: 'user' },
    { name: 'Alice Smith', email: 'alice@invitor.com', password: 'password123', role: 'user' },
    { name: 'Bob Johnson', email: 'bob@invitor.com', password: 'password123', role: 'user' },
    { name: 'Charlie Dave', email: 'charlie@invitor.com', password: 'password123', role: 'user' },
    { name: 'Diana Prince', email: 'diana@invitor.com', password: 'password123', role: 'user' },
    { name: 'Ethan Hunt', email: 'ethan@invitor.com', password: 'password123', role: 'user' },
    { name: 'Fiona Gallagher', email: 'fiona@invitor.com', password: 'password123', role: 'user' },
    { name: 'George Miller', email: 'george@invitor.com', password: 'password123', role: 'user' },
    { name: 'Hannah Montana', email: 'hannah@invitor.com', password: 'password123', role: 'user' }
];

const sampleInvites = [
    {
        title: 'React & Node.js Developer Retreat',
        description: 'Join us for a 3-day deep dive into modern full-stack web development with Invitor. Perfect for developers looking to take their skills to the next level.',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        location: 'Silicon Valley Innovation Center, CA',
        category: 'Technology',
        totalSeats: 200,
        ticketPrice: 0,
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Neon Nights EDM Festival',
        description: 'Experience an unforgettable night of EDM, techno, and dazzling light shows with top DJs from around the globe, exclusively managed on Invitor.',
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        location: 'Grand Arena, New York',
        category: 'Music',
        totalSeats: 500,
        ticketPrice: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Global Leaders Business Summit',
        description: 'A premium gathering of CEOs, founders, and investors discussing the future of global commerce and AI integration. Grab your Invitor passport pass.',
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        location: 'The Ritz-Carlton, London',
        category: 'Business',
        totalSeats: 150,
        ticketPrice: 5000,
        imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Modern Art Expo 2026',
        description: 'Discover breathtaking contemporary and modern arts from underground and trending artists this season through your Invitor registration dashboard.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        location: 'Downtown Art Museum',
        category: 'Art',
        totalSeats: 300,
        ticketPrice: 200,
        imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Startup Pitch Competition',
        description: 'Watch 25 startups pitch for 1 million dollars in seed funding. Great networking for entrepreneurs and angel investors via Invitor match systems.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: 'Convention Center, Miami',
        category: 'Business',
        totalSeats: 250,
        ticketPrice: 100,
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Cloud Computing Architecture Seminar',
        description: 'A purely technical breakdown of scalable cloud solutions, multi-region routing, and serverless compute processing setups hosted on Invitor.',
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        location: 'Tech Hub, Seattle',
        category: 'Technology',
        totalSeats: 100,
        ticketPrice: 600,
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800'
    },

    // --- 5 NEW TECHNOLOGY EVENTS ---
    {
        title: 'AI & Machine Learning Bootcamp',
        description: 'An intensive hands-on workshop focused on training custom LLMs and deploying deep neural networks. Authorized passes available through Invitor.',
        date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        location: 'Innovation Hub, San Francisco',
        category: 'Technology',
        totalSeats: 120,
        ticketPrice: 450,
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Cybersecurity Defense Forum',
        description: 'Learn contemporary ethical hacking practices, penetration testing workflows, and zero-trust architectural network principles.',
        date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        location: 'Metropolitan Convention Hall, Austin',
        category: 'Technology',
        totalSeats: 180,
        ticketPrice: 350,
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Next-Gen Web Frameworks Panel',
        description: 'A panel discussion exploring compilation mechanics in modern rendering engines, edge functions, and real-time frontend syncing frameworks.',
        date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
        location: 'Digital Workspace Arena, Boston',
        category: 'Technology',
        totalSeats: 140,
        ticketPrice: 0,
        imageUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'DevOps & Kubernetes Masterclass',
        description: 'Master CI/CD pipeline automation, automated scaling triggers, cluster routing infrastructures, and containerized cloud ecosystems.',
        date: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000),
        location: 'Cloud Infrastructure Center, Denver',
        category: 'Technology',
        totalSeats: 90,
        ticketPrice: 550,
        imageUrl: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Mobile App Architecture Summit',
        description: 'Explore optimized asynchronous workflows, cross-platform performance patterns, local data caching, and native hardware integrations.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        location: 'App Developers Zone, Chicago',
        category: 'Technology',
        totalSeats: 210,
        ticketPrice: 150,
        imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800'
    },

    // --- 5 NEW MUSIC EVENTS ---
    {
        title: 'Symphony Under the Stars',
        description: 'A classical orchestral live performance featuring masterpieces from timeless composers performed live in an open-air theater setup.',
        date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        location: 'Amphitheater Green Park, Nashville',
        category: 'Music',
        totalSeats: 400,
        ticketPrice: 80,
        imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Jazz & Blues Retro Lounge',
        description: 'Immerse yourself in live acoustic instrumentation, improvisational vocal rhythms, and slow tempo blues sets from vintage ensembles.',
        date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        location: 'The Blue Note Lounge, New Orleans',
        category: 'Music',
        totalSeats: 120,
        ticketPrice: 45,
        imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Rock Resonance Arena Tour',
        description: 'Get ready for high-energy alternative rock acts, distorted guitar solos, and stadium-rock anthems tracked through Invitor entry systems.',
        date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        location: 'Starlight Stadium, Las Vegas',
        category: 'Music',
        totalSeats: 600,
        ticketPrice: 120,
        imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Acoustic Indie Sunset Sessions',
        description: 'Unplugged musical showcases featuring independent songwriters, fingerstyle guitar melodies, and intimate ambient arrangements.',
        date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        location: 'Coastal Open Stage, Malibu',
        category: 'Music',
        totalSeats: 150,
        ticketPrice: 30,
        imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Global Beats Hip-Hop Showcase',
        description: 'Catch cutting-edge rhythm patterns, electronic sub-bass loops, and rapid-fire flows from emerging independent hip-hop lyricists.',
        date: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
        location: 'Underground Pulse Collective, Atlanta',
        category: 'Music',
        totalSeats: 350,
        ticketPrice: 65,
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800'
    },

    // --- 6 NEW BUSINESS EVENTS ---
    {
        title: 'E-Commerce Scaling Blueprint',
        description: 'Unpack advanced retention frameworks, multi-channel supply operations, logistics tracking infrastructures, and targeted ad conversions.',
        date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        location: 'Commerce Center, Los Angeles',
        category: 'Business',
        totalSeats: 160,
        ticketPrice: 190,
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Venture Capital Networking Gala',
        description: 'An exclusive networking event matching early-stage founders with tier-one seed fund managers and active angel syndicates.',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        location: 'Skyline Elite Lounge, Manhattan',
        category: 'Business',
        totalSeats: 80,
        ticketPrice: 1200,
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Corporate Leadership & Culture Forum',
        description: 'Explore frameworks for distributed workplace dynamics, organizational communication, equity architectures, and talent retention strategies.',
        date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
        location: 'Enterprise Academy, Philadelphia',
        category: 'Business',
        totalSeats: 220,
        ticketPrice: 250,
        imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'FinTech Disruptors Roundtable',
        description: 'A deep look into decentralized financial ledgers, open banking API specifications, and automated algorithmic compliance engines.',
        date: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
        location: 'Financial District Plaza, Charlotte',
        category: 'Business',
        totalSeats: 110,
        ticketPrice: 400,
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Sustainable Enterprise Conference',
        description: 'Analyze carbon accounting frameworks, circular material workflows, eco-friendly procurement models, and green regulatory certifications.',
        date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        location: 'Green Building Auditorium, Portland',
        category: 'Business',
        totalSeats: 190,
        ticketPrice: 0,
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Real Estate Investment Summit',
        description: 'A structural guide to commercial zoning markets, debt syndication modeling, spatial value analysis, and tax-deferred asset loops.',
        date: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
        location: 'Grand Ballroom, Phoenix',
        category: 'Business',
        totalSeats: 300,
        ticketPrice: 300,
        imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'
    },

    // --- 7 NEW ART EVENTS ---
    {
        title: 'Abstract Expressionism Workshop',
        description: 'Experiment with gestural paint applications, canvas layering mediums, and spatial balance color studies with master instructors.',
        date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        location: 'Metropolitan Art Studio, Boston',
        category: 'Art',
        totalSeats: 45,
        ticketPrice: 75,
        imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Sculpture & Spatial Forms Gallery',
        description: 'Examine cast bronze structures, geometric clay fabrications, and kinetic wire installations from contemporary minimalists.',
        date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        location: 'Fine Arts Exhibition Center, Santa Fe',
        category: 'Art',
        totalSeats: 150,
        ticketPrice: 20,
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Digital Canvas & Crypto-Art Vernissage',
        description: 'Discover generative fractal loops, algorithmic projection landscapes, and tokenized verifiable visual media digital assets.',
        date: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
        location: 'Pixel Matrix Gallery, San Francisco',
        category: 'Art',
        totalSeats: 250,
        ticketPrice: 50,
        imageUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7edd96c?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Street Art & Mural Collective',
        description: 'A live urban aerosol demonstration exploring isometric graphic lettering, stencil spraying methodologies, and community scaling forms.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: 'Brickyard Arts Courtyard, Brooklyn',
        category: 'Art',
        totalSeats: 500,
        ticketPrice: 0,
        imageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Monochrome Photography Exposition',
        description: 'Analyze silver-halide chemical processing techniques, analog dynamic exposure balances, and fine-art shadow composition.',
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        location: 'The Lens & Aperture Pavilion, Chicago',
        category: 'Art',
        totalSeats: 180,
        ticketPrice: 15,
        imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Renaissance Masterpieces Studies Session',
        description: 'A highly structured historical lecture exploring oil blending mediums, architectural perspective scaling, and early iconographies.',
        date: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        location: 'Heritage Institute Hall, Washington',
        category: 'Art',
        totalSeats: 100,
        ticketPrice: 90,
        imageUrl: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Avant-Garde Interactive Installations Tour',
        description: 'Engage with sensor-triggered spatial soundscapes, physical kinetic sculptures, and real-time biometric generative artwork displays.',
        date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
        location: 'Prism Modern Art Center, Seattle',
        category: 'Art',
        totalSeats: 130,
        ticketPrice: 40,
        imageUrl: 'https://images.unsplash.com/photo-1501472312651-726afe119ff1?auto=format&fit=crop&q=80&w=800'
    }
];

const seedDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoURI) {
            throw new Error("MongoDB Connection string path configuration is completely missing from your environment setup.");
        }

        await mongoose.connect(mongoURI);
        console.log('\n✅ MongoDB connection handshake open...');

        // Clear existing data sets entirely
        await User.deleteMany({});
        await Invite.deleteMany({});
        await Booking.deleteMany({});
        console.log('🗑️  Wiped out old collection documents cleanly.');

        // Hash system user passwords uniformly
        const salt = await bcrypt.genSalt(10);
        const hashedUsers = users.map(u => ({
            ...u,
            password: bcrypt.hashSync(u.password, salt),
            isVerified: true
        }));

        const createdUsers = await User.insertMany(hashedUsers);
        const adminUser = createdUsers.find(u => u.role === 'admin');
        const normalUsers = createdUsers.filter(u => u.role === 'user');
        console.log(`👤 Injected ${createdUsers.length} profile documents successfully into Invitor backend.`);

        // Map updates to match the Invite schema setup correctly
        const validatedInvites = sampleInvites.map(e => ({
            ...e,
            availableSeats: e.totalSeats,
            createdBy: adminUser._id
        }));

        const createdInvites = await Invite.insertMany(validatedInvites);
        console.log(`🎉 Injected ${createdInvites.length} dynamic invite configurations into cluster loop.`);

        // Allocate multi-user access simulations
        const bookingsData = [];

        for (const invite of createdInvites) {
            // Pick a group of 3-6 random users for each passport entry
            const randomCount = Math.floor(Math.random() * 4) + 3;
            const shuffledUsers = [...normalUsers].sort(() => 0.5 - Math.random());
            const selectedUsers = shuffledUsers.slice(0, randomCount);

            for (const user of selectedUsers) {
                const statuses = ['pending', 'confirmed', 'cancelled'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];

                let paymentStatus = 'not_paid';
                if (status === 'confirmed' && invite.ticketPrice > 0) {
                    paymentStatus = Math.random() > 0.1 ? 'paid' : 'not_paid';
                } else if (invite.ticketPrice === 0) {
                    paymentStatus = 'paid';
                }

                bookingsData.push({
                    userId: user._id,
                    eventId: invite._id, // References your dynamic card id mapping
                    status: status,
                    paymentStatus: paymentStatus,
                    amount: invite.ticketPrice
                });

                // Deduct active seat counters down dynamically for confirmed registrations
                if (status === 'confirmed') {
                    invite.availableSeats -= 1;
                }
            }
            // Save seat counter changes back to the cluster matching document
            await invite.save();
        }

        await Booking.insertMany(bookingsData);
        console.log(`🎫 Inserted ${bookingsData.length} mock booking interactions into tracking documents.`);

        console.log('\n🚀 Invitor Database seeding complete!');
        console.log('-------------------------------------------');
        console.log('Admin Access Email: admin@invitor.com');
        console.log('User Access Email:  user@invitor.com');
        console.log('Password for all:   password123');
        console.log('-------------------------------------------\n');

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Critical crash caught inside your seeding operations pipeline:', error.message);
        process.exit(1);
    }
};

seedDatabase();
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "mysql://root:password@localhost:3306/qr_menu_saas";
const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
const [, user, password, host, port, database] = match ?? ["", "root", "password", "localhost", "3306", "qr_menu_saas"];

const adapter = new PrismaMariaDb({
  host,
  port: parseInt(port, 10),
  user,
  password,
  database,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed başlıyor...");

  // ── Planlar ──────────────────────────────────────────────────────────────
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: "Free",
        price: 0,
        maxMenus: 1,
        maxCategories: 5,
        maxItems: 20,
        maxQrCodes: 1,
        analyticsEnabled: false,
        customDomain: false,
      },
    }),
    prisma.plan.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: "Starter",
        price: 199,
        maxMenus: 3,
        maxCategories: 20,
        maxItems: 100,
        maxQrCodes: 10,
        analyticsEnabled: true,
        customDomain: false,
      },
    }),
    prisma.plan.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: "Pro",
        price: 499,
        maxMenus: 10,
        maxCategories: 50,
        maxItems: 500,
        maxQrCodes: 50,
        analyticsEnabled: true,
        customDomain: true,
      },
    }),
    prisma.plan.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: "Enterprise",
        price: 1299,
        maxMenus: 999,
        maxCategories: 999,
        maxItems: 9999,
        maxQrCodes: 999,
        analyticsEnabled: true,
        customDomain: true,
      },
    }),
  ]);
  console.log(`✅ ${plans.length} plan oluşturuldu`);

  // ── Demo Restoran ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const restaurant = await prisma.restaurant.upsert({
    where: { email: "demo@qrmenu.com" },
    update: {},
    create: {
      planId: 2, // Starter
      name: "Lezzet Durağı",
      slug: "lezzet-duragi",
      email: "demo@qrmenu.com",
      passwordHash,
      phone: "+90 555 123 45 67",
      address: "Bağdat Caddesi No:42, Kadıköy / İstanbul",
      primaryColor: "#e85d04",
      currency: "TRY",
      language: "tr",
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
    },
  });
  console.log(`✅ Demo restoran: ${restaurant.name} (${restaurant.email})`);

  // ── Demo Menü ─────────────────────────────────────────────────────────────
  const menu = await prisma.menu.upsert({
    where: { id: 1 },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: "Ana Menü",
      description: "Tüm yemek ve içeceklerimiz",
      isDefault: true,
    },
  });

  // ── Kategoriler & Ürünler ─────────────────────────────────────────────────
  const seedData = [
    {
      name: "Başlangıçlar",
      items: [
        { name: "Mercimek Çorbası", price: 65, calories: 180, description: "Geleneksel kırmızı mercimek çorbası, limon ile servis edilir.", isPopular: false },
        { name: "Sigara Böreği", price: 85, calories: 320, description: "Çıtır hamur içinde beyaz peynir ve maydanoz.", isPopular: true },
        { name: "Humus Tabağı", price: 95, calories: 250, description: "Ev yapımı humus, zeytinyağı ve pul biber ile.", isPopular: false },
        { name: "Ezme Salatası", price: 75, calories: 120, description: "Domates, biber, soğan, taze nane.", isPopular: false },
      ],
    },
    {
      name: "Ana Yemekler",
      items: [
        { name: "Adana Kebap", price: 280, calories: 580, description: "El yapımı kıyma kebabı, közlenmiş biber ve soğan ile.", isPopular: true },
        { name: "Izgara Tavuk", price: 220, calories: 420, description: "Marine edilmiş tavuk göğsü, yanında pilav ve salata.", isPopular: false },
        { name: "Kuzu Tandır", price: 350, calories: 650, description: "8 saat pişirilmiş kuzu but, bulgur pilavı ile.", isPopular: true },
        { name: "Sebzeli Güveç", price: 180, calories: 310, description: "Mevsim sebzeleri, domates sos ile fırında.", isPopular: false },
        { name: "Balık Izgara", price: 320, calories: 380, description: "Günlük taze levrek, zeytinyağlı yeşilliklerle.", isPopular: false },
      ],
    },
    {
      name: "Salatalar",
      items: [
        { name: "Çoban Salatası", price: 70, calories: 90, description: "Domates, salatalık, biber, zeytinyağı.", isPopular: false },
        { name: "Roka Salatası", price: 95, calories: 110, description: "Roka, parmesan, limon sosu, çam fıstığı.", isPopular: true },
        { name: "Mevsim Salatası", price: 80, calories: 105, description: "Günün taze sebzeleri, ev yapımı sos.", isPopular: false },
      ],
    },
    {
      name: "Tatlılar",
      items: [
        { name: "Baklava", price: 120, calories: 450, description: "Antep fıstıklı ev baklavası, şerbet ile.", isPopular: true },
        { name: "Sütlaç", price: 85, calories: 280, description: "Fırında üstü kızarmış geleneksel sütlaç.", isPopular: false },
        { name: "Künefe", price: 130, calories: 520, description: "Hatay usulü peynirli künefe, kaymak ile.", isPopular: true },
      ],
    },
    {
      name: "İçecekler",
      items: [
        { name: "Ayran", price: 30, calories: 60, description: "Ev yapımı soğuk ayran.", isPopular: true },
        { name: "Türk Çayı", price: 20, calories: 5, description: "Demlik çay, iki bardak.", isPopular: false },
        { name: "Türk Kahvesi", price: 45, calories: 10, description: "Geleneksel köpüklü Türk kahvesi, lokum ile.", isPopular: false },
        { name: "Limonata", price: 55, calories: 80, description: "Taze sıkılmış limon, nane, soda.", isPopular: true },
        { name: "Su (0.5L)", price: 15, calories: 0, description: null, isPopular: false },
      ],
    },
  ];

  let catCount = 0;
  let itemCount = 0;

  for (let i = 0; i < seedData.length; i++) {
    const { name, items } = seedData[i];
    const cat = await prisma.category.upsert({
      where: { id: i + 1 },
      update: {},
      create: { menuId: menu.id, name, sortOrder: i },
    });
    catCount++;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      await prisma.menuItem.create({
        data: {
          categoryId: cat.id,
          name: item.name,
          description: item.description,
          price: item.price,
          calories: item.calories,
          isPopular: item.isPopular,
          sortOrder: j,
        },
      }).catch(() => {}); // Tekrar çalıştırılırsa skip
      itemCount++;
    }
  }
  console.log(`✅ ${catCount} kategori, ${itemCount} ürün oluşturuldu`);

  // ── Demo QR Kodlar ────────────────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const tables = ["1", "2", "3", "4", "5"];

  for (const table of tables) {
    const params = new URLSearchParams({ t: table });
    // id bilinmiyor, önce oluştur sonra url güncelle
    const code = await prisma.qrCode.create({
      data: {
        restaurantId: restaurant.id,
        menuId: menu.id,
        tableNumber: table,
        label: `Masa ${table}`,
        url: "",
        scanCount: Math.floor(Math.random() * 40),
      },
    });
    params.set("qr", String(code.id));
    await prisma.qrCode.update({
      where: { id: code.id },
      data: { url: `${baseUrl}/m/${restaurant.id}/${menu.id}?${params}` },
    });
  }
  console.log(`✅ ${tables.length} QR kod oluşturuldu`);

  console.log("\n🎉 Seed tamamlandı!");
  console.log(`\n   E-posta : demo@qrmenu.com`);
  console.log(`   Şifre   : demo1234\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

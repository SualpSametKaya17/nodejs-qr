/**
 * Superadmin kullanıcı oluşturma scripti
 * Kullanım: node scripts/create-superadmin.mjs
 *
 * Production sunucusunda projenin kök dizininde çalıştırın.
 */

import bcrypt from "bcryptjs";
import mariadb from "mariadb";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Hata: DATABASE_URL ortam değişkeni tanımlı değil.");
  process.exit(1);
}

const match = DATABASE_URL.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/]+)(?::(\d+))?\/(.+)$/);
if (!match) {
  console.error("Hata: DATABASE_URL formatı geçersiz.");
  process.exit(1);
}

const [, user, password, host, portStr, database] = match;
const port = portStr ? parseInt(portStr, 10) : 3306;

const EMAIL    = "triposltd@gmail.com";
const PASSWORD = "Tripos1907!";
const NAME     = "Tripos Admin";
const SLUG     = "tripos-admin";

async function main() {
  const conn = await mariadb.createConnection({ host, port, user, password, database });

  try {
    // Mevcut kullanıcı kontrolü
    const existing = await conn.query("SELECT id FROM restaurants WHERE email = ?", [EMAIL]);
    if (existing.length > 0) {
      console.log(`Kullanıcı zaten mevcut (id: ${existing[0].id}). role güncelleniyor...`);
      await conn.query(
        "UPDATE restaurants SET role = 'superadmin' WHERE email = ?",
        [EMAIL]
      );
      console.log("✓ role = 'superadmin' olarak güncellendi.");
      return;
    }

    // Plan id bul (ücretsiz veya ilk plan)
    const plans = await conn.query("SELECT id FROM plans ORDER BY price ASC LIMIT 1");
    const planId = plans.length > 0 ? plans[0].id : 1;

    // Şifreyi hashle
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    // Slug benzersizliği
    const slugCheck = await conn.query("SELECT id FROM restaurants WHERE slug = ?", [SLUG]);
    const finalSlug = slugCheck.length > 0 ? `${SLUG}-${Date.now()}` : SLUG;

    // Kullanıcıyı ekle
    const result = await conn.query(
      `INSERT INTO restaurants
        (planId, name, slug, email, passwordHash, role, isActive, subscriptionPlan, subscriptionStatus, currency, language, timezone, menuStyle, cartEnabled, orderingEnabled, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'superadmin', 1, 'free', 'active', 'TRY', 'tr', 'Europe/Istanbul', 'card', 1, 1, NOW(), NOW())`,
      [planId, NAME, finalSlug, EMAIL, passwordHash]
    );

    const newId = Number(result.insertId);

    // Varsayılan menü oluştur
    await conn.query(
      "INSERT INTO menus (restaurantId, name, isDefault, isActive, createdAt, updatedAt) VALUES (?, 'Ana Menü', 1, 1, NOW(), NOW())",
      [newId]
    );

    console.log(`✓ Superadmin kullanıcı oluşturuldu (id: ${newId})`);
    console.log(`  E-posta : ${EMAIL}`);
    console.log(`  Şifre   : ${PASSWORD}`);
    console.log(`  Role    : superadmin`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});

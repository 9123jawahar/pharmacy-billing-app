/**
 * Seeds a fresh database with a realistic demo dataset so the app is
 * instantly testable end-to-end: users for every role, suppliers, a drug
 * catalog with substitutes/expiries/low-stock cases, customers with
 * allergies & chronic conditions, subscriptions due for refill, doctors,
 * a coupon, and a couple of finalized sample orders.
 *
 * Run with: npm run seed   (or: npx prisma db seed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("🌱 Seeding database...");

  // --- Users ---------------------------------------------------------------
  const [admin, pharmacist, clerk] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@pharmacy.test" },
      update: {},
      create: { name: "Asha Rao", email: "admin@pharmacy.test", passwordHash: await hash("Admin@123"), role: "ADMIN", phone: "9800000001" },
    }),
    prisma.user.upsert({
      where: { email: "pharmacist@pharmacy.test" },
      update: {},
      create: {
        name: "Dr. Vikram Shah",
        email: "pharmacist@pharmacy.test",
        passwordHash: await hash("Pharma@123"),
        role: "PHARMACIST",
        phone: "9800000002",
      },
    }),
    prisma.user.upsert({
      where: { email: "clerk@pharmacy.test" },
      update: {},
      create: { name: "Priya Nair", email: "clerk@pharmacy.test", passwordHash: await hash("Clerk@123"), role: "BILLING_CLERK", phone: "9800000003" },
    }),
  ]);

  // --- Suppliers -------------------------------------------------------------
  const [sunPharma, cipla, mankind] = await Promise.all([
    prisma.supplier.create({ data: { name: "Sun Pharma Distributors", phone: "8000000001", email: "orders@sunpharma-dist.test", address: "MIDC, Mumbai" } }),
    prisma.supplier.create({ data: { name: "Cipla Regional Supply Co.", phone: "8000000002", email: "sales@cipla-supply.test", address: "Andheri, Mumbai" } }),
    prisma.supplier.create({ data: { name: "Mankind Pharma Wholesale", phone: "8000000003", email: "wholesale@mankind-dist.test", address: "Powai, Mumbai" } }),
  ]);

  // --- Drug catalog ------------------------------------------------------
  // A mix of: healthy stock, low stock (<10), expired, and expiring-soon items,
  // plus brand <-> substitute relationships for the same active ingredient.
  const crocin = await prisma.drug.create({
    data: {
      name: "Crocin 500mg",
      genericName: "Paracetamol",
      composition: "Paracetamol 500mg",
      symptoms: ["fever", "headache", "body pain", "cold"],
      manufacturer: "GSK",
      category: "Analgesic",
      batchNumber: "CR-2401",
      supplierId: sunPharma.id,
      stockQuantity: 240,
      reorderLevel: 20,
      costPrice: 12.5,
      sellingPrice: 22,
      gstPercent: 12,
      expiryDate: daysFromNow(400),
      rackLocation: "A-01-2",
      requiresRx: false,
    },
  });

  const dolo = await prisma.drug.create({
    data: {
      name: "Dolo 650",
      genericName: "Paracetamol",
      composition: "Paracetamol 650mg",
      symptoms: ["fever", "headache", "body pain"],
      manufacturer: "Micro Labs",
      category: "Analgesic",
      batchNumber: "DL-2402",
      supplierId: cipla.id,
      stockQuantity: 8, // low stock
      reorderLevel: 15,
      costPrice: 14,
      sellingPrice: 25,
      gstPercent: 12,
      expiryDate: daysFromNow(500),
      rackLocation: "A-01-5",
      requiresRx: false,
    },
  });

  const paracip = await prisma.drug.create({
    data: {
      name: "Paracip 650",
      genericName: "Paracetamol",
      composition: "Paracetamol 650mg",
      symptoms: ["fever", "headache"],
      manufacturer: "Cipla",
      category: "Analgesic",
      batchNumber: "PC-2312",
      supplierId: cipla.id,
      stockQuantity: 60,
      reorderLevel: 15,
      costPrice: 13,
      sellingPrice: 24,
      gstPercent: 12,
      expiryDate: daysFromNow(15), // expiring soon
      rackLocation: "A-01-6",
      requiresRx: false,
    },
  });

  await prisma.drug.update({
    where: { id: crocin.id },
    data: { substitutes: { connect: [{ id: dolo.id }, { id: paracip.id }] } },
  });

  const augmentin = await prisma.drug.create({
    data: {
      name: "Augmentin 625 Duo",
      genericName: "Amoxicillin + Clavulanic Acid",
      composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",
      symptoms: ["bacterial infection", "throat infection", "sinusitis"],
      manufacturer: "GSK",
      category: "Antibiotic",
      batchNumber: "AU-2350",
      supplierId: sunPharma.id,
      stockQuantity: 5, // low stock
      reorderLevel: 10,
      costPrice: 85,
      sellingPrice: 129,
      gstPercent: 12,
      expiryDate: daysFromNow(-10), // expired
      rackLocation: "B-02-1",
      requiresRx: true,
    },
  });

  const azithral = await prisma.drug.create({
    data: {
      name: "Azithral 500",
      genericName: "Azithromycin",
      composition: "Azithromycin 500mg",
      symptoms: ["bacterial infection", "throat infection", "respiratory infection"],
      manufacturer: "Alembic",
      category: "Antibiotic",
      batchNumber: "AZ-2401",
      supplierId: mankind.id,
      stockQuantity: 150,
      reorderLevel: 20,
      costPrice: 45,
      sellingPrice: 78,
      gstPercent: 12,
      expiryDate: daysFromNow(300),
      rackLocation: "B-02-4",
      requiresRx: true,
    },
  });

  const metformin = await prisma.drug.create({
    data: {
      name: "Glycomet 500",
      genericName: "Metformin",
      composition: "Metformin Hydrochloride 500mg",
      symptoms: ["diabetes", "high blood sugar"],
      manufacturer: "USV",
      category: "Antidiabetic",
      batchNumber: "GM-2280",
      supplierId: mankind.id,
      stockQuantity: 320,
      reorderLevel: 30,
      costPrice: 18,
      sellingPrice: 32,
      gstPercent: 5,
      expiryDate: daysFromNow(600),
      rackLocation: "C-03-1",
      requiresRx: true,
    },
  });

  const cetirizine = await prisma.drug.create({
    data: {
      name: "Cetrizine 10mg",
      genericName: "Cetirizine",
      composition: "Cetirizine Hydrochloride 10mg",
      symptoms: ["allergy", "sneezing", "runny nose", "itching"],
      manufacturer: "Dr. Reddy's",
      category: "Antihistamine",
      batchNumber: "CT-2390",
      supplierId: cipla.id,
      stockQuantity: 200,
      reorderLevel: 25,
      costPrice: 8,
      sellingPrice: 15,
      gstPercent: 12,
      expiryDate: daysFromNow(450),
      rackLocation: "A-04-2",
      requiresRx: false,
    },
  });

  const pantoprazole = await prisma.drug.create({
    data: {
      name: "Pantocid 40",
      genericName: "Pantoprazole",
      composition: "Pantoprazole 40mg",
      symptoms: ["acidity", "heartburn", "gastric reflux"],
      manufacturer: "Sun Pharma",
      category: "Antacid",
      batchNumber: "PT-2270",
      supplierId: sunPharma.id,
      stockQuantity: 7, // low stock
      reorderLevel: 15,
      costPrice: 6,
      sellingPrice: 11,
      gstPercent: 12,
      expiryDate: daysFromNow(250),
      rackLocation: "A-04-6",
      requiresRx: false,
    },
  });

  // --- Doctors -------------------------------------------------------------
  const [drMehta, drIyer, drKhan] = await Promise.all([
    prisma.doctor.create({
      data: { name: "Sunita Mehta", speciality: "General Physician", clinicAddress: "Mehta Clinic, Bandra West", contactNumber: "9911100001" },
    }),
    prisma.doctor.create({
      data: { name: "Ramesh Iyer", speciality: "Endocrinologist", clinicAddress: "Iyer Diabetes Care, Andheri East", contactNumber: "9911100002" },
    }),
    prisma.doctor.create({
      data: { name: "Ayesha Khan", speciality: "ENT Specialist", clinicAddress: "Khan ENT Hospital, Powai", contactNumber: "9911100003" },
    }),
  ]);

  // --- Customers -------------------------------------------------------------
  const ravi = await prisma.customer.create({
    data: {
      name: "Ravi Kumar",
      phone: "9822200001",
      email: "ravi.kumar@example.com",
      age: 58,
      gender: "Male",
      address: "12 Lake View Rd, Mumbai",
      chronicConditions: ["Diabetes", "Hypertension"],
      allergies: ["Sulfa drugs"],
      loyaltyPoints: 40,
    },
  });

  const meera = await prisma.customer.create({
    data: {
      name: "Meera Joshi",
      phone: "9822200002",
      email: "meera.joshi@example.com",
      age: 34,
      gender: "Female",
      address: "45 Hill Rd, Mumbai",
      chronicConditions: [],
      allergies: ["Penicillin"],
      loyaltyPoints: 15,
    },
  });

  const arjun = await prisma.customer.create({
    data: {
      name: "Arjun Verma",
      phone: "9822200003",
      age: 27,
      gender: "Male",
      chronicConditions: [],
      allergies: [],
      loyaltyPoints: 0,
    },
  });

  // --- Subscriptions (chronic refills) ---------------------------------------
  await prisma.subscription.create({
    data: { customerId: ravi.id, drugId: metformin.id, quantity: 60, frequencyDays: 30, nextDueDate: daysFromNow(2), status: "ACTIVE" },
  });
  await prisma.subscription.create({
    data: { customerId: ravi.id, drugId: cetirizine.id, quantity: 10, frequencyDays: 30, nextDueDate: daysFromNow(-3), status: "ACTIVE" }, // overdue
  });

  // --- Loyalty / coupons -----------------------------------------------------
  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrderValue: 200,
      maxDiscount: 100,
      validFrom: daysFromNow(-30),
      validTo: daysFromNow(60),
      usageLimit: 500,
    },
  });
  await prisma.coupon.create({
    data: {
      code: "FLAT50",
      type: "FLAT",
      value: 50,
      minOrderValue: 500,
      validFrom: daysFromNow(-10),
      validTo: daysFromNow(30),
      usageLimit: 200,
    },
  });

  // --- Sample finalized order --------------------------------------------
  const subtotal = Number(crocin.sellingPrice) * 2 + Number(cetirizine.sellingPrice) * 1;
  const taxAmount = Number(crocin.sellingPrice) * 2 * (Number(crocin.gstPercent) / 100) + Number(cetirizine.sellingPrice) * (Number(cetirizine.gstPercent) / 100);
  const netTotal = subtotal + taxAmount;

  const order = await prisma.order.create({
    data: {
      invoiceNumber: "INV-000001",
      customerId: meera.id,
      doctorId: drMehta.id,
      userId: clerk.id,
      subtotal,
      taxAmount,
      discountAmount: 0,
      loyaltyPointsUsed: 0,
      loyaltyDiscount: 0,
      netTotal,
      paymentMethod: "CASH",
      status: "FINALIZED",
      items: {
        create: [
          { drugId: crocin.id, quantity: 2, unitPrice: crocin.sellingPrice, gstPercent: crocin.gstPercent, lineTotal: Number(crocin.sellingPrice) * 2 },
          { drugId: cetirizine.id, quantity: 1, unitPrice: cetirizine.sellingPrice, gstPercent: cetirizine.gstPercent, lineTotal: cetirizine.sellingPrice },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      orderId: order.id,
      customerId: meera.id,
      channel: "SMS",
      recipient: meera.phone,
      message: `Thank you for your purchase! Invoice ${order.invoiceNumber} for ₹${netTotal.toFixed(2)} is ready.`,
      invoiceUrl: `https://pharmacy.example.com/invoices/${order.invoiceNumber}`,
      status: "SENT",
    },
  });

  const pointsEarned = Math.floor(netTotal / 100);
  if (pointsEarned > 0) {
    await prisma.loyaltyTransaction.create({
      data: { customerId: meera.id, orderId: order.id, points: pointsEarned, reason: `Earned on invoice ${order.invoiceNumber}` },
    });
    await prisma.customer.update({ where: { id: meera.id }, data: { loyaltyPoints: { increment: pointsEarned } } });
  }

  // --- Audit trail seed entries -----------------------------------------
  await prisma.auditLog.create({
    data: { userId: admin.id, action: "LOGIN", entity: "User", entityId: admin.id, description: "Admin seeded & logged in" },
  });
  await prisma.auditLog.create({
    data: { userId: pharmacist.id, action: "CREATE", entity: "Drug", entityId: crocin.id, description: "Added drug Crocin 500mg during seeding" },
  });

  console.log("✅ Seed complete.");
  console.log("");
  console.log("Demo logins:");
  console.log("  Admin:      admin@pharmacy.test / Admin@123");
  console.log("  Pharmacist: pharmacist@pharmacy.test / Pharma@123");
  console.log("  Clerk:      clerk@pharmacy.test / Clerk@123");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

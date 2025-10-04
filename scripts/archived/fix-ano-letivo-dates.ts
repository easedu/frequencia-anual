/**
 * Script para converter datas do ano_letivo para formato DD/MM/YYYY
 *
 * Problema: As datas no array 'dates' dentro de cada bimestre estão em ISO (YYYY-MM-DD)
 * Solução: Converter para DD/MM/YYYY que é o formato esperado pela tela
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const YEAR = '2025';

/**
 * Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY
 */
function convertISOtoDDMMYYYY(isoDate: string): string {
  // Check if already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) {
    return isoDate;
  }

  // Convert from YYYY-MM-DD to DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // If neither format, return as is
  console.warn(`Unknown date format: ${isoDate}`);
  return isoDate;
}

/**
 * Convert startDate and endDate from ISO to DD/MM/YYYY
 */
function convertStartEndDates(dateStr: string): string {
  if (!dateStr) return dateStr;

  // If already DD/MM/YYYY, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  return dateStr;
}

async function fixAnoLetivoDates() {
  console.log('🔧 Fixing ano_letivo dates format...\n');

  try {
    // Get ano_letivo document
    const docRef = doc(db, YEAR, 'ano_letivo');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error('❌ Document ano_letivo not found!');
      process.exit(1);
    }

    const data = docSnap.data();
    const bimesterKeys = Object.keys(data).filter(key => key.includes('Bimestre'));

    console.log(`Found ${bimesterKeys.length} bimestres\n`);

    let totalDatesFixed = 0;
    let totalStartEndFixed = 0;
    const updatedData: any = {};

    // Process each bimester
    for (const bimesterKey of bimesterKeys) {
      const bimesterData = data[bimesterKey];

      if (!bimesterData) continue;

      console.log(`📅 Processing: ${bimesterKey}`);

      const updatedBimester: any = { ...bimesterData };

      // Fix startDate and endDate
      if (bimesterData.startDate) {
        const originalStart = bimesterData.startDate;
        const convertedStart = convertStartEndDates(originalStart);
        if (originalStart !== convertedStart) {
          updatedBimester.startDate = convertedStart;
          console.log(`  ✓ startDate: ${originalStart} → ${convertedStart}`);
          totalStartEndFixed++;
        }
      }

      if (bimesterData.endDate) {
        const originalEnd = bimesterData.endDate;
        const convertedEnd = convertStartEndDates(originalEnd);
        if (originalEnd !== convertedEnd) {
          updatedBimester.endDate = convertedEnd;
          console.log(`  ✓ endDate: ${originalEnd} → ${convertedEnd}`);
          totalStartEndFixed++;
        }
      }

      // Fix dates array
      if (bimesterData.dates && Array.isArray(bimesterData.dates)) {
        let datesFixed = 0;

        updatedBimester.dates = bimesterData.dates.map((dateObj: any) => {
          if (!dateObj.date) return dateObj;

          const originalDate = dateObj.date;
          const convertedDate = convertISOtoDDMMYYYY(originalDate);

          if (originalDate !== convertedDate) {
            datesFixed++;
            totalDatesFixed++;
            return { ...dateObj, date: convertedDate };
          }

          return dateObj;
        });

        if (datesFixed > 0) {
          console.log(`  ✓ Fixed ${datesFixed} dates in array`);
        }
      }

      updatedData[bimesterKey] = updatedBimester;
      console.log('');
    }

    // Update document if there were changes
    if (totalDatesFixed > 0 || totalStartEndFixed > 0) {
      console.log('💾 Saving changes to Firestore...');
      await updateDoc(docRef, updatedData);
      console.log('✅ Document updated successfully!\n');

      console.log('📊 Summary:');
      console.log(`  - Dates in arrays fixed: ${totalDatesFixed}`);
      console.log(`  - Start/End dates fixed: ${totalStartEndFixed}`);
      console.log(`  - Total changes: ${totalDatesFixed + totalStartEndFixed}`);
    } else {
      console.log('✅ All dates are already in correct format!');
    }

    console.log('\n🎉 Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixAnoLetivoDates();
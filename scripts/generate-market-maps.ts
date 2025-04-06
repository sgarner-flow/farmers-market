/**
 * Script to generate static map images for each market location
 * 
 * This script uses Puppeteer to visit the market map page for each location,
 * take a screenshot of the vendor map section, and save it to the public directory.
 * 
 * Usage:
 * npx ts-node scripts/generate-market-maps.ts
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const LOCATIONS = [
  'Miami',
  'FLL',
  'Brickell',
  'Aventura',
  'El Portal',
  'Granada'
];

async function generateMarketMaps() {
  console.log('Starting market map generation...');
  
  // Launch Puppeteer
  const browser = await puppeteer.launch({ 
    headless: true,
  });
  
  try {
    // Create a directory for location-specific maps if it doesn't exist
    const locationMapsDir = path.join(process.cwd(), 'public', 'market-maps');
    if (!fs.existsSync(locationMapsDir)) {
      fs.mkdirSync(locationMapsDir, { recursive: true });
    }
    
    // Default map for emails
    let defaultMapPath = path.join(process.cwd(), 'public', 'Market-Map.png');
    
    // Generate maps for each location
    for (const location of LOCATIONS) {
      const page = await browser.newPage();
      
      // Set a desktop viewport
      await page.setViewport({
        width: 1200,
        height: 1200,
        deviceScaleFactor: 2 // Higher resolution
      });
      
      // Navigate to the market map page with the specific location
      const url = `http://localhost:3000/market-map?location=${encodeURIComponent(location)}`;
      console.log(`Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Wait for the map to fully render
      await page.waitForSelector('.grid-cols-2.sm\\:grid-cols-4.lg\\:grid-cols-8');
      
      // Use setTimeout instead of waitForTimeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Locate and screenshot just the market layout section
      const mapElement = await page.$('.bg-white.rounded-2xl.shadow-md.p-6.md\\:p-8');
      if (mapElement) {
        // Take screenshot of just the map element
        const mapPath = path.join(locationMapsDir, `${location.replace(' ', '-')}-Map.png`);
        await mapElement.screenshot({ path: mapPath });
        console.log(`Generated map for ${location} at ${mapPath}`);
        
        // Use Miami as the default map for emails
        if (location === 'Miami') {
          fs.copyFileSync(mapPath, defaultMapPath);
          console.log(`Set Miami map as the default at ${defaultMapPath}`);
        }
      } else {
        console.error(`Could not find map element for ${location}`);
      }
      
      await page.close();
    }
    
    console.log('Market map generation complete!');
  } catch (error) {
    console.error('Error generating market maps:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
generateMarketMaps().catch(console.error); 
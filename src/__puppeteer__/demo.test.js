/* eslint-env jest */
import puppeteer from 'puppeteer';

const width = 1600;
const height = 1200;

jest.setTimeout(60000);

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('demo mode', () => {
  let browser;
  let page;

  beforeEach(async () => {
    await delay(500);
  });
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 80,
      args: [`--window-size=${width},${height}`]
    });
    page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
    });
    await page.goto('localhost:3002/?demo=1');
    // wait 5 seconds for the data to start loading...
    await delay(10000);

    return true;
  });
  afterAll(async () => {
    await page.close();
    await browser.close();
    return true;
  });

  it('should load data', async () => {
    await expect(page).toClick('.t-capline input[type="checkbox"]');
    await delay(500);
    await expect(page).toClick('.cabana-meta-messages-list-item');
    await delay(500);
    await expect(page).toClick('.button--tiny.button--alpha');
  });
});

require("dotenv").config();
const config = require("./config.json");

const puppeteer = require("puppeteer");
const path = require("path");
const fsPromises = require("fs/promises");
const {
  weekEndMounth,
  isSameMonth,
  getPromotionDay,
  getPromotionMessage,
  checkOverPostLimit,
} = require("./utiles");

// NOTE: キャプチャ保存的のディレクトリ名を定義
const dirname = path.join(__dirname, "img");

// NOTE: 告知したい日付を取得
// - Bufferでdata属性に指定されている"aria-label属性と同じ "EEE MMM dd yyyy"形式
const promotionDay = getPromotionDay(weekEndMounth);

//ポスト数がBufferの無料プランの上限に達しているかチェック
checkOverPostLimit(promotionDay.length, config.buffer_fleeplan_limit_post);

(async () => {
  // NOTE: Debug用にparamを渡してブラウザを表示
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 10,
  });
  const page = await browser.newPage();
  // NOTE: ページの表示サイズを指定
  await page.setViewport({
    width: 1200,
    height: 800,
    deviceScaleFactor: 1,
  });

  // ----------------------------------------------------------------
  await page.goto("https://publish.buffer.com/");

  // NOTE: キャッシュをクリア
  await page.setCacheEnabled(false);
  await page.reload({ waitUntil: "networkidle2" });

  // NOTE: IDとPASSを入力
  await page.waitForSelector("#login-form #email");
  await page.type("#login-form #email", process.env.BUFFER_USER_ID);
  await page.waitForSelector("#login-form #password");
  await page.type("#login-form #password", process.env.BUFFER_USER_PASSWORD);

  // ログインボタンをクリック
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.evaluate(() => document.getElementById("login-form-submit").click()),
  ]);
  console.log(`INFO: ログインしました`);
  // ----------------------------------------------------------------

  // ポップアップされる広告枠がある場合のみ削除する
  const adElement = await page.$("#start-trial-modal");
  if (adElement !== null) {
    await page.keyboard.press("Escape");
  }

  // 移動前に十分な待ち時間を設ける
  await page.waitForTimeout(3000); // 3秒待つ
  // NOTE: 月表示での設定画面にページ遷移
  await page.goto("https://publish.buffer.com/calendar/month");
  // ----------------------------------------------------------------

  // NOTE: 告知予定日の数だけ実行する
  // - 毎土曜日および、イベント開催日の前日、イベント当日
  for (let i = 0; i < promotionDay.length; i++) {
    try {
      // NOTE: Create Postの表示エリアを取得されるまで待機
      await page.waitForSelector(
        '[class^="style__CalendarHeaderRightSide-publish"]'
      );
      // NOTE: Create Postボタンをクリック
      await page.click(
        '[class^="style__CalendarHeaderRightSide-publish"] [class^="Button__ButtonWrapperStyle"]:last-child button'
      );

      // NOTE: 告知文章のモーダルが出るまで待機
      await page.waitForSelector('[id="composer-root"]');

      // NOTE: 告知文章のモーダル内包の入力エリアをクリック
      await page.waitForSelector('[data-testid="composer-text-area"]');
      await page.click('[data-testid="composer-text-area"]');
      // 告知内容を入力する
      await page.type(
        '[data-testid="composer-text-area"]',
        getPromotionMessage(i, config.prefix_message)
      );

      // NOTE: "Add to Queue" のボタンが表示されるまで待機
      await page.waitForSelector(
        '[data-testid="stacked-save-buttons-section"]'
      );
      // NOTE: "Add to Queue" の▼ボタンをクリック
      await page.click(
        '[data-testid="stacked-save-buttons-section"] div[role="button"]'
      );
      // NOTE: "SCHEDULE_POST" のプルダウンが表示されるまで待機
      await page.waitForSelector(
        '[data-testid="stacked-save-buttons-section"] div[aria-expanded="true"]'
      );
      // NOTE: "Add to Queue" の▼ボタンをクリック
      await page.click(
        '[data-testid="stacked-save-buttons-section"] div[role="button"] li#SCHEDULE_POST'
      );

      // NOTE: カレンダーが表示されるまで待機
      await page.waitForSelector('[data-testid="schedule-time-container"]');

      // DayPicker-Monthのテキスト要素を取得
      const dayPickerMonthText = await page.$eval(
        '.DayPicker-Month[role="grid"] div:first-child span',
        (item) => {
          return item.textContent; // MEMO : 例/September 2022
        }
      );

      // NOTE: configで指定した月と、Bufferのモーダルで表示された月が一致しない場合、
      // 前月のカレンダーが指定されているため、次の月に変更する
      if (!isSameMonth(dayPickerMonthText, config.event_mounth)) {
        await page.click(
          '[data-testid="date-time-picker"] .DayPicker .DayPicker-wrapper > div div:last-child button'
        );
      }
      // NOTE: イベントの日程をクリック
      await page.click(`.DayPicker-Day[aria-label="${promotionDay[i]}"]`);

      // NOTE: 開催日の告知時間がイベント後になる可能性があるため、時間の指定を明示的に定義
      await page.select(
        '[data-testid="date-time-picker"] select[class^="Select-publish"]:first-child',
        "10"
      );
      await page.select(
        '[data-testid="date-time-picker"] select[class^="Select-publish"]:last-child',
        "am"
      );

      if (process.env.DRY_RUN) {
        // NOTE: 入力した状態のキャプチャを保存する
        const destination = path.join(dirname, `dry-run_message_0${i + 1}.png`);
        await fsPromises.mkdir(path.dirname(destination), {
          recursive: true,
        });
        await page.screenshot({ path: destination });
        console.log(
          "INFO: キャプチャを保存しました（DRY-RUN確認用）",
          destination
        );
      }

      if (process.env.DRY_RUN) {
        // NOTE: ドライランの場合は、キャンセルするためモーダル外をクリック
        await page.click("#navigator");
        // NOTE: 削除モーダルが表示されるまで待機
        await page.waitForSelector('section[class^="style__Modal"]');
        // NOTE: 削除モーダルの "Yes, Close Composer"ボタンをクリック
        await page.click(
          'section[class^="style__Modal"] > div > div:last-child'
        );
        console.log(
          `INFO: "${promotionDay[i]}" の告知をDRY-RUNしました（キャンセル）`
        );
      } else {
        // NOTE: Scheduleボタンをクリックしてポップアップを閉じる
        await page.click(
          '[data-testid="date-time-picker"] button[class^="Button__ButtonStyled"]'
        );
        console.log(`INFO: "${promotionDay[i]}" の告知を作成しました`);
      }
    } catch (e) {
      console.log(`INFO: "${promotionDay[i]}" の告知作成に失敗しました`);
      console.error(e);
    }
    // NOTE: 再実行時に失敗を防ぐため、3秒待機
    await new Promise((r) => setTimeout(r, 3000));
  }

  // NOTE: DRY-RUNじゃない場合は、イベントが正しく作成されているかどうかわかるようにキャプチャを取る
  if (!process.env.DRY_RUN) {
    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    console.log(
      "INFO: ページをリロードしました。キャプチャの準備を開始します..."
    );

    // NOTE: カレンダーの月を取得
    await page.waitForSelector('[class^="styles__DateRangeText-publish"]');
    const currentMonth = await page.$eval(
      '[class^="styles__DateRangeText-publish"]',
      (item) => {
        return item.textContent;
      }
    );
    // NOTE: 登録した月が表示されていない場合は、次の月を表示する
    if (!isSameMonth(currentMonth, config.event_mounth)) {
      await page.click(
        '[class^="styles__NavigationButtons-publish"] > div:last-child'
      );
    }

    // NOTE: 登録完了した状態のキャプチャを保存する
    const destination = path.join(dirname, "result.png");
    await fsPromises.mkdir(path.dirname(destination), {
      recursive: true,
    });
    await page.screenshot({ path: destination });
    console.log("INFO: キャプチャを保存しました。", destination);
  }

  await browser.close();
  console.log("INFO: すべての処理が完了しました。ブラウザを閉じます");
})();

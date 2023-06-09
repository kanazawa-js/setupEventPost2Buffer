require("dotenv").config();
const config = require("./config.json");

const format = require("date-fns/format");
const isAfter = require("date-fns/isAfter");
const subDays = require("date-fns/subDays");
const isSaturday = require("date-fns/isSaturday");
const eachWeekendOfMonth = require("date-fns/eachWeekendOfMonth");
const ja = require("date-fns/locale/ja");

const weekEndMounth = eachWeekendOfMonth(new Date(config.event_mounth));
exports.weekEndMounth = weekEndMounth;

/**
 * ポスト数がBufferの無料プランの上限に達しているか判定
 * @param {number} promotionDayCount 告知対象の日数
 * @param {number} PostLimitCount Bufferの無料プランの上限 （8件）
 */
const checkOverPostLimit = (promotionDayCount, PostLimitCount) => {
  try {
    // NOTE: falsyな値じゃないかの確認
    if (!promotionDayCount || !PostLimitCount)
      throw new Error("引数がfalsyです");
    if (promotionDayCount > PostLimitCount) {
      throw new Error("ERROR: Bufferの無料プランの投稿上限に達しています");
    }
  } catch (error) {
    throw new Error(error);
  }
};
exports.checkOverPostLimit = checkOverPostLimit;

/**
 * Bufferで告知登録したい全ての土曜日とイベント前日の日程を配列形式で取得
 * @param {array} weekEndMounth 指定した月の土日すべてを含む配列
 * @param {date} nowDate 現在日時
 * @returns {array} 毎週の土曜日と、最後の土曜日の前日を含む配列
 */
const getSocialPromotionDay = (weekEndMounth, nowDate = new Date()) => {
  try {
    // MOTE: 配列じゃない場合はErrorをthrowする
    if (!Array.isArray(weekEndMounth))
      throw new Error("引数が配列ではありません");
    // MOTE: 配列じゃない場合はErrorをthrowする
    if (Array.isArray(weekEndMounth) && weekEndMounth.length === 0)
      throw new Error("配列が空です");
    // NOTE: 告知対象の土曜日だけの配列を生成 （SNS告知の対象日）
    const satadayList = weekEndMounth
      .map((date) => isSaturday(date) && date)
      .filter(Boolean);
    // NOTE: 最後の土曜日を取得 （kzjsのデフォルト開催日）
    const lastSataday = satadayList.slice(-1)[0];
    if (!isSaturday(lastSataday))
      throw new Error("最後の土曜日が取得できません");
    // NOTE: 最後の土曜日から1日前を取得 （SNS告知対象日）
    const lastSatadayPrevDay = subDays(lastSataday, 1);
    // // NOTE: 最後の土曜日から1日前を配列に格納
    satadayList.splice(satadayList.length - 1, 0, lastSatadayPrevDay);
    // 現在日時と比較して、過去の日付を削除
    const promotionDayList = satadayList
      .map((list) => isAfter(list, nowDate) && list)
      .filter(Boolean);
    return promotionDayList;
  } catch (error) {
    throw new Error(error);
  }
};
exports.getSocialPromotionDay = getSocialPromotionDay;

/**
 * Bufferに表示されている月日表示と指定した月日が一致するか判定
 * @param {string} currentMonth Bufferに表示された "MMM yyyy | MMMM yyyy"形式の月日
 * @param {string} eventMounth configで設定した "yyyy-MM"形式の月日
 */
const isSameMonth = (currentMonth, eventMounth) => {
  try {
    // NOTE: falsyな値じゃないかの確認と、currentMonthは "MMM yyyy" で8桁以上、
    // eventMounthは "yyyy-MM" で7桁以上が必要なので、簡易的にチェックする
    if (!currentMonth || !eventMounth) throw new Error("引数がfalsyです");
    if (currentMonth.toString().length <= 7)
      throw new Error('第1引数が"MMM yyyy"形式ではありません');
    if (eventMounth.toString().length <= 6)
      throw new Error('第2引数が"yyyy-MM"形式ではありません');
    // 指定したイベント開催日をISO8601形式に変換
    const eventMounthDate = new Date(eventMounth);
    // NOTE: 渡されたcurrentMonthがMMM yyyy形式の（月表示が短い）場合は、
    // 4桁目に必ず半角スペースが入るため有無を確認してフォーマットを変更
    const monthFormat =
      currentMonth.charAt(3) === " " ? "MMM yyyy" : "MMMM yyyy";
    return format(eventMounthDate, monthFormat) === currentMonth;
  } catch (error) {
    throw new Error(error);
  }
};
exports.isSameMonth = isSameMonth;

/**
 * 告知予定日を"EEE MMM dd yyyy"形式の値が含まれた配列で返却する
 * @param {array} weekEndMounth 指定した月の土日すべてを含む配列
 * @returns {array} 告知予定日 ["EEE MMM dd yyyy", ...]形式の配列
 */
const getPromotionDay = (weekEndMounth) => {
  try {
    // MOTE: 配列じゃない場合はErrorをthrowする
    if (!Array.isArray(weekEndMounth))
      throw new Error("引数が配列ではありません");
    // MOTE: 配列じゃない場合はErrorをthrowする
    if (Array.isArray(weekEndMounth) && weekEndMounth.length === 0)
      throw new Error("配列が空です");
    // NOTE: フォーマットを"EEE MMM dd yyyy"形式に変更
    const promotionDay_jp = getSocialPromotionDay(weekEndMounth).map((date) =>
      format(date, "EEE MMM dd yyyy")
    );
    return promotionDay_jp;
  } catch (error) {
    throw new Error(error);
  }
};
exports.getPromotionDay = getPromotionDay;

/**
 * 告知予定日に応じた文章を整形して返却する
 * @param {number} index 告知予定日の配列のインデックス（月初から昇順）
 * @param {array} configPrefixMessage 告知の前に付ける文章が格納された配列
 * @returns {string} SNS告知用の文章
 */
const getPromotionMessage = (index, configPrefixMessage) => {
  try {
    // NOTE: 告知予定日の配列数を取得
    const promotionDayCount = getSocialPromotionDay(weekEndMounth).length;
    // NOTE: indexの値が不正な場合はErrorをthrowする
    if (promotionDayCount < index + 1)
      throw new Error("Loopの回数が不正です（配列の範囲外）");
    if (!configPrefixMessage) throw new Error("configの値が不正です");
    // NOTE: configに設定された接頭詞数に等しい形となるように削る
    const promotionDayList = configPrefixMessage.slice(0, promotionDayCount);
    // NOTE: 月初から昇順で取得できるように逆順にする
    const longestPromotionDayList = promotionDayList.reverse();
    // NOTE: indexで呼び出された告知予定日の接頭詞文を取得
    const prefixMessage = longestPromotionDayList[index];
    // NOTE: イベント日を取得（配列の最後に登録された日）
    const eventnDay = getSocialPromotionDay(weekEndMounth).pop();
    // NOTE: 表示を整えるためにイベント日を"yyyy年MM月dd日（曜）"形式に変換
    const eventnDay_ja = format(eventnDay, "yyyy/MM/dd(EE)", { locale: ja });
    // NOTE: 各設定値を結合して告知文を作成
    const promotionMessage = `${prefixMessage}${eventnDay_ja}にKanazawa.js ${config.numbering}th「${config.title}」会を行います👋\n${config.message}詳細はイベントページをご確認ください👇 #kzjs \nhttps://kanazawajs.connpass.com/event/${config.connpass_event_id}`;
    return promotionMessage;
  } catch (error) {
    throw new Error(error);
  }
};
exports.getPromotionMessage = getPromotionMessage;

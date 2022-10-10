require("dotenv").config();
const config = require("./config.json");

const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
const isSaturday = require("date-fns/isSaturday");
const ja = require("date-fns/locale/ja");
const eachWeekendOfMonth = require("date-fns/eachWeekendOfMonth");

const {
  checkOverPostLimit,
  getSocialPromotionDay,
  isSameMonth,
  getPromotionDay,
  getPromotionMessage,
} = require("./utiles");

describe("checkOverPostLimit / ポスト数がBufferの無料プランの上限に達しているか判定", () => {
  describe("正常系", () => {
    it("引数の検証: Buffeの無料プラン条件以下の場合はErrorが出ないこと", () => {
      expect(() => {
        for (let i = 0; i < config.buffer_fleeplan_limit_post; i++) {
          checkOverPostLimit(i + 1, config.buffer_fleeplan_limit_post);
        }
      }).not.toThrow();
    });
  });
  describe("異常系", () => {
    it("引数の検証: 引数が不足している場合、Errorになること", () => {
      expect(() => {
        checkOverPostLimit() ||
          checkOverPostLimit(null, 1) ||
          checkOverPostLimit(1, null);
      }).toThrow("引数がfalsyです");
    });
    it("引数の検証: 引数が不足している場合、Errorになること", () => {
      expect(() => {
        checkOverPostLimit(9, config.buffer_fleeplan_limit_post);
      }).toThrow("ERROR: Bufferの無料プランの投稿上限に達しています");
    });
  });
});

describe("getSocialPromotionDay / Bufferで告知登録したい全ての土曜日とイベント前日の日程を配列形式で取得 - ", () => {
  describe("正常系", () => {
    it("返却値の検証: 全て土曜日が返却されること", () => {
      const weekEndMounth = eachWeekendOfMonth(new Date("2022-10"));
      const result = getSocialPromotionDay(weekEndMounth);
      result.map((date) => isSaturday(date));
    });
    it("返却値の検証: 2022年10月を開催日に指定した場合、2022/10/29(土)が返却されること", () => {
      const weekEndMounth = eachWeekendOfMonth(new Date("2022-10"));
      const result = getSocialPromotionDay(weekEndMounth);
      expect(
        // NOTE: ISO8601形式のため、文字列変換して検証可能な状態にする
        format(result.pop(), "yyyy/MM/dd(EE)", {
          locale: ja,
        })
      ).toBe("2022/10/29(土)");
    });
    it("返却値の検証: 2022年11月を開催日に指定した場合、2022/11/26(土)が返却されること", () => {
      const weekEndMounth = eachWeekendOfMonth(new Date("2022-11"));
      const result = getSocialPromotionDay(weekEndMounth);
      expect(
        // NOTE: ISO8601形式のため、文字列変換して検証可能な状態にする
        format(result.pop(), "yyyy/MM/dd(EE)", {
          locale: ja,
        })
      ).toBe("2022/11/26(土)");
    });
    it("返却値の検証: 告知日の配列数が、実行日付に応じたものが返却されること", () => {
      // NOTE: 仮に、2022/10をイベント開催月とする
      const weekEndMounth = eachWeekendOfMonth(new Date("2022-10"));
      // NOTE: スクリプトを実行日した日時を擬似的に指定する
      const testNowDateList = [
        "2022-10-27T15:00:00.000Z", // イベント前日に実行した場合
        "2022-10-26T15:00:00.000Z", // イベント2日前に実行した場合
        "2022-10-20T15:00:00.000Z", // イベント1週前の金曜日に実行した場合
        "2022-10-13T15:00:00.000Z", // イベント2週前の金曜日に実行した場合
        "2022-10-06T15:00:00.000Z", // イベント3週前の金曜日に実行した場合
        "2022-09-29T15:00:00.000Z", // イベント4週前の金曜日に実行した場合
      ];
      expect(
        testNowDateList.map((date, index) => {
          const promoDayCount = getSocialPromotionDay(
            weekEndMounth,
            new Date(date)
          ).length;
          // 例: 1週間前の金曜日に実行した場合、告知日は3日分なので、3が返却される
          return promoDayCount === index + 1;
        })
      );
    });
  });
  describe("異常系", () => {
    it("引数の検証: 引数が存在しない場合、Errorになること", () => {
      expect(() => {
        getSocialPromotionDay() || getSocialPromotionDay("hoge");
      }).toThrow("引数が配列ではありません");
    });
    it("引数の検証: 引数の配列が空の場合、Errorになること", () => {
      expect(() => {
        getSocialPromotionDay([]);
      }).toThrow("配列が空です");
    });
  });
});

describe("isSameMonth / Bufferに表示されている月日表示と指定した月日が一致するか判定", () => {
  describe("正常系", () => {
    it("返却値の検証: MMM yyyy形式で'Oct 2022'と'2022-10'でtrueが返却されること", () => {
      expect(isSameMonth("Oct 2022", "2022-10")).toBe(true);
    });
    it("返却値の検証: MMMM yyyy形式で'September 2022'と'2022-09'でtrueが返却されること", () => {
      expect(isSameMonth("September 2022", "2022-09")).toBe(true);
    });
    it("返却値の検証: MMM yyyy形式で'Oct 2022'と'2022-09'でfalseが返却されること", () => {
      expect(isSameMonth("Oct 2022", "2022-09")).toBe(false);
    });
    it("返却値の検証: MMMM yyyy形式で'October 2022'と'2022-09'でfalseが返却されること", () => {
      expect(isSameMonth("October 2022", "2022-09")).toBe(false);
    });
  });

  describe("異常系", () => {
    it("引数の検証: 引数が存在しない場合、Errorになること", () => {
      expect(() => {
        isSameMonth();
      }).toThrow("引数がfalsyです");
    });
    it("引数の検証: 第1引数が不足している場合、Errorになること", () => {
      expect(() => {
        isSameMonth("", "2022-10");
      }).toThrow("引数がfalsyです");
    });
    it("引数の検証: 第2引数が不足している場合、Errorになること", () => {
      expect(() => {
        isSameMonth("October 2022", "");
      }).toThrow("引数がfalsyです");
    });
    it("引数の検証: 第1引数が8桁以下の場合、Errorになること", () => {
      expect(() => {
        isSameMonth("Oct 202", "2022-10");
      }).toThrow('第1引数が"MMM yyyy"形式ではありません');
    });
    it("引数の検証: 第2引数が7桁以下の場合、Errorになること", () => {
      expect(() => {
        isSameMonth("Oct 2022", "2022-1");
      }).toThrow('第2引数が"yyyy-MM"形式ではありません');
    });
  });
});

describe('getPromotionDay / 告知予定日を"EEE MMM dd yyyy"形式で取得する', () => {
  describe("正常系", () => {
    it("返却値の検証: 取得した配列の値すべてが EEE MMM dd yyyy形式であること", () => {
      const weekEndMounth = eachWeekendOfMonth(new Date("2022-10"));
      getPromotionDay(weekEndMounth).map((date) => {
        isMatch(date, "EEE MMM dd yyyy");
      });
    });
  });
  describe("異常系", () => {
    it("引数の検証: 引数が存在しない場合、Errorになること", () => {
      expect(() => {
        getPromotionDay() || getPromotionDay("hoge");
      }).toThrow("引数が配列ではありません");
    });
    it("引数の検証: 引数の配列が空の場合、Errorになること", () => {
      expect(() => {
        getPromotionDay([]);
      }).toThrow("配列が空です");
    });
  });
});

describe("getPromotionMessage", () => {
  describe("正常系", () => {
    it("値の検証 返却される接頭詞が期待値通りであること", () => {
      expect(() => {
        msg.map((message, i) => {
          console.warn(message);
          message.startsWith(config.prefix_message[i]);
        });
      });
    });
    it("値の検証 返却されるイベント開催日が土曜日であること", () => {
      expect(getPromotionMessage(0, config.prefix_message)).toMatch(/(土)/);
    });
    it("値の検証 返却されるイベントのナンバリングが期待値通りであること", () => {
      expect(getPromotionMessage(0, config.prefix_message)).toMatch(
        config.numbering
      );
    });
    it("値の検証 返却されるイベントのタイトルが期待値通りであること", () => {
      expect(getPromotionMessage(0, config.prefix_message)).toMatch(
        config.title
      );
    });
    it("値の検証 返却される補足メッセージが期待値通りであること", () => {
      expect(getPromotionMessage(0, config.prefix_message)).toMatch(
        config.message
      );
    });
    it("値の検証 返却されるイベントURLが期待値通りであること", () => {
      expect(getPromotionMessage(0, config.prefix_message)).toMatch(
        `https://kanazawajs.connpass.com/event/${config.connpass_event_id}`
      );
    });
  });
  describe("異常系", () => {
    it("引数の検証: 告知予定日の数以上にLoopした場合、Errorになること", () => {
      expect(() => {
        getPromotionMessage(10, config.prefix_message);
      }).toThrow("Loopの回数が不正です（配列の範囲外");
    });
    it("config設定値の検証: config内の接頭詞の数と不一致の場合、Errorになること", () => {
      expect(() => {
        getPromotionMessage(0, false);
      }).toThrow("configの値が不正です");
    });
  });
});

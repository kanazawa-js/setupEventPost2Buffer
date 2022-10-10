# setupEventPost2Buffer.js

puppeteerを利用してBufferにKanazawa.jsのイベント告知を登録するScriptです。

## 使う前の設定

1. config.json内の値を編集します。
  a. event_mounth : イベント開催日の指定。yyyy-mmで都度、指定します。
  b. connpass_event_id : 新たに作成したconnpassイベントページのIDを都度、指定します。
  c. numbering : 第XX回の数字を都度、指定します。
  d. title : イベント名に変更がある場合は指定します（例: "わいわい開発&LT", "モブプロでNext.jsハンズオン"）
  e. message : イベント内容軽く補足する内容です。変更がある場合は指定します。（例: "SlackとGatherを利用したリモート開催です。", "今回はオフラインでの開催です。"）
  f. prefix_message : 編集開催日程に応じて接頭詞にされる文字列です。これは編集しません。
  g.  buffer_fleeplan_limit_post: Bufferの無料プランでは8件までしか登録できないため制限値としてconfigにも記載。これも編集しません。
2. `.env.example` を `.env` にリネームして、kzjsのBufferアカウントID/PASSを環境変数として指定します

## 使い方

- npm run start :dryrun : BufferにPostを登録する直前のキャプチャを告知回数分撮影し投稿登録をキャンセルします。
  - puppeteerで指定しているUIに変更が発生していないかどうかの確認や、configで設定した値に問題がないかどうかの確認が行えます。
- npm run start : BufferにPostを登録します。完了した後、カレンダー表示画面に追加された投稿がわかる状態のキャプチャを撮影します。

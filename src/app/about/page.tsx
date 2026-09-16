// このページの本文は、アプリの実際の挙動(ログイン方法・投稿の仕組み・
// 非公開設定・管理者の役割など)を説明したものです。今後これらの仕様を
// 変更した場合は、この本文も実際の挙動に合わせて書き直してください。

export default function AboutPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>このサイトについて</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "38rem" }}>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.8 }}>
          サークルが毎年発行している機関誌を、原稿の投稿から冊子としての公開まで、
          まとめて扱うためのサイトです。
        </p>

        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.6rem" }}>ログインについて</h2>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
            一般のメンバーがこのサイトを使うのにログインは必要ありません。年度一覧から号を選び、
            名簿画面か投稿画面で自分の名前を選ぶと、以降はそのブラウザで自分の欄として扱われます。
            端末やブラウザを変えた場合は、あらためて名前を選び直してください。
          </p>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.8, marginTop: "0.6rem" }}>
            管理者だけは、管理画面に入るためにGoogleアカウントでのログインが必要です。
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.6rem" }}>原稿の投稿</h2>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
            投稿は一人一件までです。あとから出し直すと、前に出した分と置き換わります。
          </p>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.8, marginTop: "0.6rem" }}>
            投稿の際に「非公開にする」を選ぶと、その原稿をもとに管理者が冊子のセクションを
            作った場合でも、自分と管理者以外にはそのセクションが表示されません。
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.6rem" }}>冊子の閲覧</h2>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
            投稿された原稿を管理者が整え、順番を決めて冊子のセクションとして公開します。
            年度一覧から号を選ぶと、その号の冊子ビューアで、公開されているセクションを
            閲覧できます。
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.6rem" }}>管理者の役割</h2>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
            管理者は、投稿されたファイルのダウンロード、冊子セクションの追加・並び替え・削除、
            名簿の作成・編集、新しい年度の号の作成を行います。
          </p>
        </section>
      </div>
    </div>
  );
}

// このページの本文は、アプリの実際の挙動(ログイン方法・投稿の仕組み・
// 非公開設定・管理者の役割など)を説明したものです。今後これらの仕様を
// 変更した場合は、この本文も実際の挙動に合わせて書き直してください。

const paragraph = { fontSize: "0.9rem", lineHeight: 1.8 } as const;
const paragraphNext = { ...paragraph, marginTop: "0.6rem" } as const;
const heading = { fontSize: "1.05rem", marginBottom: "0.6rem" } as const;

export default function AboutPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>このサイトについて</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "38rem" }}>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.8 }}>
          サークルの機関誌を、原稿の投稿から冊子としての公開まで、ひとつの場所で扱うためのサイトです。
        </p>

        <section>
          <h2 style={heading}>ログインについて</h2>
          <p style={paragraph}>
            一般のメンバーにログインはありません。年度一覧から号を開き、名簿で自分の名前を選ぶだけで、
            以降はそのブラウザが自分の欄として扱われます。端末やブラウザを変えたときは、名簿で選び直してください。
          </p>
          <p style={paragraphNext}>
            管理者だけは、管理画面に入るためにGoogleアカウントでログインします。あらかじめ登録された
            アカウント以外では、ログインしても管理画面には入れません。
          </p>
        </section>

        <section>
          <h2 style={heading}>原稿の投稿</h2>
          <p style={paragraph}>
            投稿画面からPDFまたはWordファイルを出します。投稿は一人一件で、出し直すと前の分と置き換わります。
            出した原稿は投稿画面の「閲覧」からいつでも確認でき、ほかのメンバーには見えません。
          </p>
          <p style={paragraphNext}>
            「非公開にする」を選んで出すと、その原稿をもとに冊子のセクションが作られても、
            自分と管理者以外には表示されません。
          </p>
        </section>

        <section>
          <h2 style={heading}>冊子の閲覧</h2>
          <p style={paragraph}>
            管理者が投稿をもとに冊子のセクションを作り、順番を整えて公開します。各号の冊子ビューアから、
            公開されているセクションを「閲覧」で開けます。非公開のセクションは、投稿した本人と管理者にしか表示されません。
          </p>
        </section>

        <section>
          <h2 style={heading}>管理者の役割</h2>
          <p style={paragraph}>
            年度ごとの号の作成と削除、名簿の作成と編集、投稿されたファイルのダウンロード、
            冊子セクションの追加・並び替え・削除を行います。号を削除すると、その号の投稿・冊子・名簿もすべて消えます。
          </p>
        </section>
      </div>
    </div>
  );
}

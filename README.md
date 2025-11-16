# Search Tabs Customizer - 検索結果タブカスタマイズ

Google や Bing などの検索結果ページ内のタブを編集・並び替え・非表示・追加できる Chrome 拡張機能です．

## 特徴

- **タブの並び替え**: ドラッグ&ドロップで検索タブの順序を自由に変更できます
- **タブの表示/非表示**: 使わないタブを非表示にしてスッキリ表示できます
- **設定の保存**: カスタマイズした設定はサイトごとに保存されます
- **複数サイト対応**: Google, Bing, Yahoo! Japan に対応

## 対応サイト

- Google (https://www.google.com/)
- Bing (https://www.bing.com/)
- Yahoo! Japan (https://search.yahoo.co.jp/)

## インストール

### Chrome Web Store からインストール（推奨）

*準備中*

### 手動インストール（開発者向け）

1. このリポジトリをクローン
   ```bash
   git clone https://github.com/yhotta240/search-tabs-customizer-extension
   cd search-tabs-customizer-extension
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. ビルド
   ```bash
   npm run build
   ```

4. Chrome に読み込む
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」をオンにする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` ディレクトリを選択

## 使い方

詳しい使い方は [docs/USAGE.md](docs/USAGE.md) をご覧ください．

### 基本的な使い方

1. Google, Bing, Yahoo! Japan のいずれかの検索サイトで検索を実行
2. 検索結果ページに表示される拡張機能アイコンをクリック
3. モーダル設定画面が開きます
4. タブを並び替えたり，表示/非表示を切り替えたりできます
5. 設定はリアルタイムで反映され，自動的に保存されます

## ライセンス

MIT License

## 作者

- yhotta240 (https://github.com/yhotta240)

---

title: 'OSXからAmazon Glacierに写真を自動バックアップ'
date: 2014-04-20
comments: true
categories: AWS
---

今まで惰性でiPhoto使って写真管理をしてきたが，そろそろ本格的な編集/加工をしたいなと思い，Lightroomに移行した（いずれ[VSCO Film](http://vsco.co/film)を使いたい）．その際，バックアップも外付けHDDからAmazon Glacierに移行した．

Amazon Glacierは，Amazonの提供するクラウドストレージで，1GBあたり1円/月で使える．S3と比べて値段は1/10だが，データをダウンロードするには解凍する時間が必要になる．データを頻繁に取り出さないバックアップなどの用途に向いている．また，AWS Command Line Interfaceでファイル同期ができるので，スクリプトを少し書いて自動バックアップの設定も簡単にできる．

`launchctl`を使ってLightroomにぶっ込んだ写真を自動でGlacierにバックアップをする仕組みをつくった．

まず，Bucketを作成する．

```bash
$ export AWS_CONFIG_FILE=...
$ export BUCKET=...
$ aws s3 mb s3://${BUCKET}
```

次に，作成したBucketにファイルのLifecycleルールを設定する．対象はBucket内の全てのファイルで，ファイルが同期され次第すぐにGlacierに移行するようにする．これを実現するため以下のjsonファイルを準備する．

```ruby
# lifecycle.json
{
    "Rules": [
        {
            "ID": "Rule for backup",
            "Status": "Enabled",
            "Prefix": null,
            "Transition": {
                "Days": 0,
                "StorageClass": "GLACIER"
             }
         }
    ]
}
```

作成したルールをBucketに適用する．

```bash
$ aws s3api put-bucket-lifecycle --bucket ${BUCKET} --lifecycle file://lifecycle.json
```

ファイルの同期は以下のシェルスクリプトで行う．例えば`~/Photo`以下を同期する．

```bash
# backup.sh

SRC=/Users/tcnksm/Photo
BUCKET=...

echo "[$(date +%Y-%m-%d-%H-%M)] Start backup to S3"
export AWS_CONFIG_FILE=...
/usr/local/bin/aws s3 sync ${SRC} s3://${BUCKET} --delete --exclude '*.DS_Store'
echo "[$(date +%Y-%m-%d-%H-%M)] End backup to S3"
```

上で作成したシェルスクリプトを`launchd`で定期実行させる．plist（`~/Library/LaunchAgents/com.tcnksm.photo.backup.plist`）は以下のようにする．一週間に一度実行する．

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>      
      <key>Label</key>
      <string>com.tcnksm.photo.backup</string>
      <key>ProgramArguments</key>
      <array>
        <string>/Users/tcnksm/scripts/backup.sh</string>
      </array>
      <key>StartInterval</key>
      <integer>604800</integer>
      <key>StandardOutPath</key>
      <string>/Users/tcnksm/var/log/s3-backup.log</string>
      <key>StandardErrorPath</key>
      <string>/Users/tcnksm/var/log/s3-backup.log</string>
      <key>Debug</key>
      <true/>
    </dict>
</plist>

```

あとは，plistを読み込むだけ．

```bash
$ launchctl load ~/Library/LaunchAgents/com.tcnksm.photo.backup.plist
```

（ちなみに，`launchctl`コマンドの実行はiTerm.appだと`launch_msg(): Socket is not connected`でこけるので，Terminal.appから実行する．Homebrewの[Common Issues](https://github.com/Homebrew/homebrew/wiki/Common-Issues#launchctl-refuses-to-load-launchd-plist-files)を参考）


今回過去の写真も含めて50GB程度アップロードしたけど，それでも月50円程度．素晴らしい．音楽，本などもぶっ込んでおこうと思う．


### 参考

- [Private Photo Sharing the Hard Way (2013) - Tatsuhiko Miyagawa's blog](http://weblog.bulknews.net/post/71259024563/private-photo-sharing-the-hard-way-2013)
- [Daemons and Services Programming Guide: Creating Launch Daemons and Agents](https://developer.apple.com/library/mac/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- [noanoa 日々の日記 : Amazon S3（+ Glacier連携）は写真やビデオのデータを保管するには最適かも](http://blog.livedoor.jp/noanoa07/archives/1904513.html)
- [AWS CLI 1.0と新しいS3コマンド(sync)を試してみた ｜ Developers.IO](http://dev.classmethod.jp/cloud/aws/aws-cli-1-0-s3-commands/)













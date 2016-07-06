# Installation

```
apt-get install -y sox
npm install -g https://github.com/knoopx/weclap
weclap setup
curl -L https://raw.githubusercontent.com/knoopx/weclap/master/share/systemd.service > /etc/systemd/system/weclap.service
systemctl enable weclap
systemctl start weclap
```
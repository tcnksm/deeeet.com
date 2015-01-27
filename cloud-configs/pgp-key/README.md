# OpenPGP key

key is used for saving secret variables on etcd by [crypt](https://github.com/xordataexchange/crypt)

## Usage

To generate public key and secret key:

```bash
$ gpg2 --batch --armor --gen-key deeeet-com-key.batch
```

To set variable on etcd (from local PC which has public key),

```bash
$ cat <<EOF > config.json
{"test": "passw0rd"}
EOF
$ crypt set -endpoint=$ETCDCTL_PEERS -keyring deeeet-com-pubring.gpg /app/config config.json
```

```bash
$ etcdctl get /app/config
wcBMA0OL+oKDi4zdAQgAh7iKVASBZvvX6WiiLPYSZgAbhYDhZyVGqX+uK2Bc1plC/mYkqw/n3FXyL+ZC0ISdK9Hdqv6HpCthnMHmBCfhPAjV4DsrXKWO7TP0AY/TxUPMxX9sIiTzrLTJGb73134Z6l0z0Ocj2dEuhyAt5u3cucKkQb3CWGyuhM7C02aTeJoPjIkqi3agAizQn0uwcurSONpmCkArq33/Q3579iHZv42Xnr+1Dq4CkcDG9OYPyKcoixOvvW9OpB1E+aey3a4vq3yjZcFsU6pUqTQbMWMN8PLSD5uys5QarGPJ5De0hTTSuAEFfbLITrTuDiaQpwNuWv4hNOWBoUdvjVt7MozQYdLgAeTi2rFgQlWY3QzlEFfFTTwK4VDj4GLguuFpGeBM4gEcKQngPePGxbRnfiHcXuBs4YgP4Brkz6h+cBWhrDgKFqIBu4x+guAY4muDxqbgyeFT5OAz4loD/RPgVuOSr5nwHFij2OBT5DnpW6SixzkJ4BF3HWHEGQ7iOXQfneErkgA
```

```bash
$ crypt get -secret-keyring deeeet-com-secring.gpg /app/config
{"test":"passw0rd"}
```

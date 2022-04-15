const BaseAccessory = require('./base_accessory')

const LogUtil = require('../util/logutil')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class SmartKettleAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {
    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SWITCH,
      Service.Switch,
    );
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    if (!statusArr) {
      return;
    }
    for (var statusMap of statusArr) {
      switch (statusMap.code) {
        case 'status':
          let value;
          if (statusMap.value == 'heating') {
            value = true;
          } else {
            value = false;
          }
          this.setCachedState(Characteristic.On, value);
          if (this.isRefresh) {
            this.service
            .getCharacteristic(Characteristic.On)
            .updateValue(value);
          } else {
            this.getAccessoryCharacteristic(this.service, Characteristic.On);
          }
          break;
        default:
          break;
      }
    }
  }

  getAccessoryCharacteristic(service, name) {
    //set  Accessory service Characteristic
    service.getCharacteristic(name)
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        var param = {
          "commands": [
            {
              "code": 'start',
              "value": value
            }
          ]
        };
        // var param = this.getSendParam(service.displayName, value)
        this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
          this.setCachedState(Characteristic.On, value);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });
      });
  }

  //get Command SendData
  getSendParam(name, value) {
    var code;
    var value;
    const isOn = value ? true : false;
    if (this.subTypeArr.length == 1) {
      code = this.switchValue.code;
    }else{
      code = name;
    }
    value = isOn;
    return {
      "commands": [
        {
          "code": code,
          "value": value
        }
      ]
    };
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = SmartKettleAccessory;
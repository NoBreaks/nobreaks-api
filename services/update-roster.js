'use strict';

let app = require('../index');
let Character = require('../lib/character/model');
let helpers = require('../lib/helpers');
let fetch = require('node-fetch');
let Promise = require('es6-promise').Promise;
let _ = require('lodash');

const GUILD_API_PATH = '/wow/guild/Thrall/No%20Breaks';

function getMembers() {
  let query = {
    fields: 'members',
    locale: 'en_US'
  };

  let raiders = [];
  let members = [];

  fetch(helpers.buildGetUrl(GUILD_API_PATH, query))
  	.then(helpers.parseFetchResponse)
    .then((json) => {

      json.members = json.members.filter(function (el) {
        return el.rank == 0 || el.rank == 1 || el.rank == 4 || el.rank == 5 ;
      });

      _.forEach(json.members, (member) => {

        let promises = [];

        let promise = new Promise((resolve, reject) => {
          fetch('http://127.0.0.1:5000/v1/character/' + member.character.realm + '/' + encodeURIComponent(member.character.name) + '/items')
            .then(helpers.parseFetchResponse)
            .then((json) => {
              member.items = {
                averageItemLevel: json.items.averageItemLevel,
                averageItemLevelEquipped: json.items.averageItemLevelEquipped
              };
              resolve(member);
            }, (error) => {
              reject(error);
            });
        });

        promises.push(promise);

        _.forEach(promises, (promise) => {
          console.log('Starting promise');

          promise.then((member) => {
            let memberObj = {
              name: member.character.name,
              class: member.character.class,
              race: member.character.race,
              gender: member.character.gender,
              level: member.character.level,
              achievementPoints: member.character.achievementPoints,
              thumbnail: member.character.thumbnail,
              calcClass: member.character.calcClass,
              rank: member.rank
            };

            console.log('Updating:', member.name);

            Character.findOneAndUpdate({name: member.name}, member, {upsert: true}, (err, doc) => {
              if (err) { throw new Error(err); }
            });
          }, (error) => {
            console.log(error);
          });

          helpers.sleep(500);
        });

        console.log('Done');
      });
    }, (error) => {
      reject(error);
    });
}


getMembers();

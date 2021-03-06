const Sequelize = require('sequelize')
const config = require('./config/config')
const uuid = require('node-uuid')
console.log('init sequelize')

function generateId() {
	return uuid.v4()
}

let sequelize = new Sequelize(config.database, config.username, config.passwaord, {
    host: config.host,
    dialect: config.dialect,
    define: {
		underscored: false,
		freezeTableName: false,
		charset: 'utf8',
		dialectOptions: {
		  collate: 'utf8_general_ci'
		}
	},
    pool: {
        max: 5,
        min: 0,
        idle: 30000
    }
})

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const ID_TYPE = Sequelize.STRING(50)

function defineModel(name, attributes) {
	let attrs = {}
	for (let key in attributes) {
		let value = attributes[key]
		if (typeof value === 'object' && value['type']) {
			value.allowNull = value.allowNull || false
			attrs[key] = value
		} else {
			attrs[key] = {
				type: value,
				allowNull: false
			}
		}
	}
	attrs.id = {
		type: ID_TYPE,
		primaryKey: true
	}
	attrs.createdAt = {
		type: Sequelize.BIGINT,
		allowNull: false
	}
	attrs.updateAt = {
		type: Sequelize.BIGINT,
		allowNull: false
	}
	attrs.version = {
		type: Sequelize.BIGINT,
		allowNull: false
	}
	return sequelize.define(name, attrs, {
		tableName: name,
		timestamps: false,
		hooks: {
			beforeValidate: function (obj) {
				let now = Date.now()
				if (obj.isNewRecord) {
					if (!obj.id) {
						obj.id = generateId()
					}
					obj.createdAt = now
					obj.updateAt = now
					obj.version = 0
				} else {
					obj.updateAt = now
					obj.version++
				}
			}
		}
	})
}

const TYPES = ['STRING', 'INTEGER', 'BIGINT', 'TEXT', 'DOUBLE', 'DATEONLY', 'BOOLEAN']

var exp = {
    defineModel: defineModel,
    sync: () => {
        // only allow create ddl in non-production environment:
        if (process.env.NODE_ENV !== 'production') {
            return sequelize.sync({force: true})
        } else {
            throw new Error('Cannot sync() when NODE_ENV is set to \'production\'.')
        }
    }
};

for (let type of TYPES) {
    exp[type] = Sequelize[type]
}

exp.ID = ID_TYPE;
exp.generateId = generateId

module.exports = exp;
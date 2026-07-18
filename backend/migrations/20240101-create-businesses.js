'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create businesses table
    await queryInterface.createTable('businesses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
        allowNull: false,
        defaultValue: 'retail'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ownerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      subscription: {
        type: Sequelize.JSON,
        defaultValue: {
          plan: 'starter',
          status: 'trial',
          trialEndsAt: null,
          expiresAt: null,
          modules: ['core'],
          usersLimit: 3,
          smsCredits: 100
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('businesses', ['ownerId']);
    await queryInterface.addIndex('businesses', ['isActive']);

    // Add businessId to shops table
    await queryInterface.addColumn('shops', 'businessId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    // Add index for businessId
    await queryInterface.addIndex('shops', ['businessId']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove businessId from shops
    await queryInterface.removeColumn('shops', 'businessId');
    
    // Drop businesses table
    await queryInterface.dropTable('businesses');
  }
};
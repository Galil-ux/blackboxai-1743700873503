const { DataTypes } = require('sequelize');

module.exports = function(sequelize, DataTypes = sequelize.Sequelize.DataTypes) {
  const Product = sequelize.define('Product', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    variety: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    barcode: {
      type: DataTypes.STRING,
      unique: true
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
      validate: {
        isValidImageUrls(value) {
          if (!Array.isArray(value)) {
            throw new Error('Images must be an array');
          }
          value.forEach(url => {
            if (!/^https:\/\/images\.pexels\.com\/.+/.test(url)) {
              throw new Error(`${url} is not a valid Pexels image URL!`);
            }
          });
        }
      }
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['name'] },
      { fields: ['barcode'] }
    ]
  });

  // Process inventory update
  Product.processInventory = async function(items) {
    if (!this.sequelize) {
      throw new Error('Sequelize instance not available');
    }
    const transaction = await this.sequelize.transaction();
    
    try {
      const products = await this.sequelize.models.Product.findAll({
        where: { id: items.map(i => i.productId) },
        transaction
      });

      // Validate stock
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          await transaction.rollback();
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          await transaction.rollback();
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      // Update stock
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        product.stock -= item.quantity;
        await product.save({ transaction });
      }

      await transaction.commit();
      return products;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  return Product;
};

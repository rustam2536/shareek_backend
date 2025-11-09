import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';
import mongooseLoader from './mongoose';
import jobsLoader from './jobs';
import Logger from './logger';
//We have to import at least all the events once so they can be triggered
import './events';

export default async ({ expressApp }) => {
  const mongoConnection = await mongooseLoader();
  Logger.info('✌️ DB loaded and connected!');

  /**
   * WTF is going on here?
   *
   * We are injecting the mongoose models into the DI container.
   * I know this is controversial but will provide a lot of flexibility at the time
   * of writing unit tests, just go and check how beautiful they are!
   */

  const userModel = {
    name: 'userModel',
    // Notice the require syntax and the '.default'
    model: require('../models/user').default,
  };

  const loginLogsModel = {
    name: 'loginLogModel',
    // Notice the require syntax and the '.default'
    model: require('../models/logs/loginLogs').default,
  };

  const propertyModel = {
    name: 'propertyModel',
    // Notice the require syntax and the '.default'
    model: require('../models/property').default,
  };

  const chatModel = {
    name: 'chatModel',
    // Notice the require syntax and the '.default'
    model: require('../models/chat').default,
  };

  const chatMessageModel = {
    name: 'chatMessageModel',
    // Notice the require syntax and the '.default'
    model: require('../models/chatMessage').default,
  };

  const notificationModel = {
    name: 'notificationModel',
    // Notice the require syntax and the '.default'
    model: require('../models/notification').default,
  };

  const categoryModel = {
    name: 'categoryModel',
    // Notice the require syntax and the '.default'
    model: require('../models/category').default,
  };

  const citiesModel = {
    name: 'citiesModel',
    // Notice the require syntax and the '.default'
    model: require('../models/cities').default,
  };

  const commentsModel = {
    name: 'commentsModel',
    // Notice the require syntax and the '.default'
    model: require('../models/comments').default,
  };

  const reportAdsModel = {
    name: 'reportAdsModel',
    // Notice the require syntax and the '.default'
    model: require('../models/reportAds').default,
  };

  const reportUserModel = {
    name: 'reportUserModel',
    // Notice the require syntax and the '.default'
    model: require('../models/reportUser').default,
  };

  const roomModel = {
    name: 'roomModel',
    // Notice the require syntax and the '.default'
    model: require('../models/room').default,
  };

  const countryModel = {
    name: 'countryModel',
    // Notice the require syntax and the '.default'
    model: require('../models/country').default,
  };

  // It returns the agenda instance because it's needed in the subsequent loaders
  const { agenda } = await dependencyInjectorLoader({
    mongoConnection,
    models: [
      userModel,
      loginLogsModel,
      propertyModel,
      categoryModel,
      chatModel,
      notificationModel,
      citiesModel,
      chatMessageModel,
      commentsModel,
      reportAdsModel,
      reportUserModel,
      roomModel,
      countryModel,
      // salaryModel,
      // whateverModel
    ],
  });
  Logger.info('✌️ Dependency Injector loaded');

  await jobsLoader({ agenda });
  Logger.info('✌️ Jobs loaded');

  await expressLoader({ app: expressApp });
  Logger.info('✌️ Express loaded');
};

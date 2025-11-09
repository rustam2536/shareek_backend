import { Router } from 'express';
// import auth from './routes/auth';
// import user from './routes/user';
import agendash from './routes/agendash';
import user_route from './routes/user_route';
import property_route from './routes/property_route';
import category_route from './routes/category_route';
import comment_route from './routes/comment_route';
import reportAds_route from './routes/reportAds_route';
import chat_route from './routes/chat_route';
import reportUser_route from './routes/reportUser_route';
import notification_route from './routes/notification_route';
import country_route from './routes/country_route';

// guaranteed to get dependencies
export default () => {
	const app = Router();
	// auth(app);
	user_route(app);
	agendash(app);
	property_route(app);
	category_route(app);
	comment_route(app);
	reportAds_route(app);
	chat_route(app);
	reportUser_route(app);
	reportAds_route(app);
	notification_route(app);
	country_route(app);

	return app
}
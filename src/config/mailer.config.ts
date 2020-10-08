import * as config from 'config';

const globalMailerConfig = config.get('mailer');

export const mailerConfig: IMailerConfig = {
  ...globalMailerConfig,
  fromList: {
    NO_REPLY: '"Youmix" <no-reply@youmix.me>',
    SUPPORT: '""Youmix Customer Support" <support@youmix.me>',
  },
};

interface IMailerConfig {
  mailgun?: {
    api_key: string;
    domain: string;
  };
  fromList?: {
    NO_REPLY?: string;
    SUPPORT?: string;
  };
}

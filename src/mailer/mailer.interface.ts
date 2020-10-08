import { TemplateFunction } from 'ejs';

export interface IMailTemplate {
  from: string;
  subject: string;
  html: string;
}

export interface ICompiledTemplate {
  name: string;
  template: TemplateFunction;
}

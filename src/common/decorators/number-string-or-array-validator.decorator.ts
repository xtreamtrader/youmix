import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function IsNumberStringOrArray(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: ['IsNumberStringOrArray'],
      validator: IsNumberStringOrArrayConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsNumberStringOrArray' })
export class IsNumberStringOrArrayConstraint
  implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    return (
      !isNaN(value) ||
      (Array.isArray(value) &&
        value.length > 0 &&
        value.every(e => e !== undefined && e.length > 0 && !isNaN(e)))
    );
  }

  defaultMessage = (validationArguments?: ValidationArguments) =>
    'Must be a number or an array of number';
}

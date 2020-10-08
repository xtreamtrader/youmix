import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function IsStringOrArray(
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: ['IsStringOrArray'],
      validator: IsStringOrArrayConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsStringOrArray' })
export class IsStringOrArrayConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    return typeof value === 'string' || Array.isArray(value);
  }
}

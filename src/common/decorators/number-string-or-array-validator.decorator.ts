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
        value.every(
          e =>
            typeof e === 'number' ||
            (e !== undefined &&
              typeof e === 'string' &&
              e.length > 0 &&
              !isNaN(e as any)),
        ))
    );
  }

  defaultMessage = (validationArguments?: ValidationArguments) =>
    'Must be a number or an array of number';
}

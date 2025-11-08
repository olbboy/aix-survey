import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract current authenticated user from request
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If data is provided, return specific property
    return data ? user?.[data] : user;
  }
);

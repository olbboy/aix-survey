import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;

        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${delay}ms`
        );

        // Log slow requests
        if (delay > 1000) {
          this.logger.warn(
            `Slow request detected: ${method} ${url} took ${delay}ms`
          );
        }
      })
    );
  }
}

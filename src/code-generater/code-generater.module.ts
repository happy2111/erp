import {Global, Module} from '@nestjs/common';
import {
  CodeGeneratorService
} from './code-generater.service';

@Global()
@Module({
  providers: [CodeGeneratorService],
  exports: [CodeGeneratorService],
})
export class CodeGeneraterModule {}

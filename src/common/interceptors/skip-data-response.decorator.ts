import { SetMetadata } from '@nestjs/common';

export const SKIP_DATA_RESPONSE_KEY = 'skipDataResponse';

export const SkipDataResponse = () => SetMetadata(SKIP_DATA_RESPONSE_KEY, true);

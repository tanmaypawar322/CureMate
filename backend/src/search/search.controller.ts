import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../common/guards/jwt-auth.guard';

@Public()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('doctors')
  async searchDoctors(
    @Query('specialization') specialization?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    return this.searchService.searchDoctors({ specialization, city, search });
  }

  @Get('organizations')
  async searchOrganizations(
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    return this.searchService.searchOrganizations({ type, city, search });
  }
}

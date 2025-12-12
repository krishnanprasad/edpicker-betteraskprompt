import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { SmartTagRequest, SmartTagResponse } from '../models/smart-tag.model';

@Injectable({
  providedIn: 'root'
})
export class SmartTagService {
  constructor(private http: HttpClient) {}

  async generateSmartTags(request: SmartTagRequest): Promise<SmartTagResponse> {
    const endpoint = `${environment.apiBase}/gemini/smart-tags`;
    const resp$ = this.http.post<SmartTagResponse>(endpoint, request);
    return await firstValueFrom(resp$);
  }
}

import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { throwError, timer } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from "example/src/environments/environment";

@Injectable({
  providedIn: 'root'
})

export class TimelineServices { 

  private appUri = environment.appApi.endpoint;
  private trackProjectApi = "trackproject";   

  constructor(private http: HttpClient) {}  


  getTimeline(projectId:number, projectType = 'SC', accessToken: string | null = null, projectCode = '') {
    const isSf = projectType.trim().toUpperCase() === 'SF';
    const hasProjectCode = isSf && projectCode.trim().length > 0;
    const timelineApi = hasProjectCode ? 'sftimeline/timeline' : this.trackProjectApi+"/timeline";
    const param = hasProjectCode
      ? "?projectCode="+encodeURIComponent(projectCode.trim())
      : "?projectId="+encodeURIComponent(projectId)+"&projectType="+encodeURIComponent(projectType);
    let headers = new HttpHeaders();
    if (accessToken) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return this.http.get(this.appUri+ "/" + timelineApi+param, { headers }).pipe(
        retry({
          // Retry transient API/network failures twice after the initial
          // request. Do not retry client errors such as 400/401/403/404.
          count: 2,
          delay: (error: any, retryCount: number) => {
            const status = Number(error?.status ?? 0);
            const isClientError = status >= 400 && status < 500;
            if (isClientError) {
              return throwError(() => error);
            }

            console.warn('[Timeline] retrying chart API request', {
              retryCount,
              status,
              timelineApi,
              projectId,
              projectType,
              projectCode: projectCode.trim()
            });
            return timer(retryCount * 500);
          }
        }),
        map((response: any) => { 
            return response;
        }),
        catchError((error: any) => { 
            return throwError(() => error);
        })
    );
  }  
 

}

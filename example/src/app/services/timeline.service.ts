import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from "example/src/environments/environment";

@Injectable({
  providedIn: 'root'
})

export class TimelineServices { 

  private appUri = environment.appApi.endpoint;
  private trackProjectApi = "trackproject";   

  constructor(private http: HttpClient) {}  


  getTimeline(projectId:number, projectType = 'SC', accessToken: string | null = null) {
    var param = "?projectId="+encodeURIComponent(projectId)+"&projectType="+encodeURIComponent(projectType);
    let headers = new HttpHeaders();
    if (accessToken) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return this.http.get(this.appUri+ "/" + this.trackProjectApi+"/timeline"+param, { headers }).pipe(
        map((response: any) => { 
            return response;
        }),
        catchError((error: any) => { 
            return throwError(error);
        })
    );
  }  
 

}

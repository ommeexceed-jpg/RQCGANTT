import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppGanttExampleComponent } from './gantt/gantt.component'; 
import { AppExampleComponentsComponent } from './components/components.component'; 

const routes: Routes = [
    {
        path: '',
        component: AppExampleComponentsComponent,
        children: [
            { path: '', redirectTo: 'basic', pathMatch: 'full' },
            { path: 'basic', component: AppGanttExampleComponent }, 
        ]
    }
];

@NgModule({
    // imports: [
    //     RouterModule.forRoot(routes, {
    //         useHash: false,
    //         enableTracing: false,
    //         onSameUrlNavigation: 'reload'
    //     })
    // ],
    imports: [RouterModule.forRoot(routes,{ useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule {}

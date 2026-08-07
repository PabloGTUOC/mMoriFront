import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { HistoryComponent } from './history.component';
import { UserService } from '../services/user.service';
import { testingProviders } from '../../testing/testing-providers';
import { environment } from '../../environments/environment';

/**
 * The auth stub emits `null`, so the session never reaches `authenticated` and the load
 * pipeline never fires. That is deliberate — it lets these specs drive the component's own
 * logic directly, rather than through three HTTP round trips, and it keeps them honest
 * about what is being tested: the delete path and its effect on local state.
 */
describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let httpMock: HttpTestingController;
  let userService: UserService;

  const training = (oid: string, date: string) => ({
    _id: { $oid: oid },
    user_id: 'u1',
    training_date: date,
    training_type: 'Push',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    userService = TestBed.inject(UserService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with nothing pending deletion', () => {
    expect(component.pendingDelete()).toBeNull();
  });

  describe('deleting a training', () => {
    beforeEach(() => {
      component.trainings.set([training('aaa', '2026-08-01'), training('bbb', '2026-08-02')]);
    });

    it('asks before deleting rather than acting on the first click', () => {
      component.askToDelete('aaa');

      expect(component.pendingDelete()).toBe('aaa');
      // Nothing has been sent: the first click only arms the confirm.
      httpMock.expectNone(`${environment.apiUrl}/trainings/aaa`);
      expect(component.trainings().length).toBe(2);
    });

    it('cancelling leaves the row alone', () => {
      component.askToDelete('aaa');
      component.cancelDelete();

      expect(component.pendingDelete()).toBeNull();
      expect(component.trainings().length).toBe(2);
    });

    it('removes the row and refreshes the dashboard once confirmed', () => {
      const refresh = spyOn(userService, 'triggerRefresh');

      component.confirmDeleteTraining(training('aaa', '2026-08-01'));

      const request = httpMock.expectOne(`${environment.apiUrl}/trainings/aaa`);
      expect(request.request.method).toBe('DELETE');
      request.flush({ success: true });

      expect(component.trainings().map((t) => t._id?.$oid)).toEqual(['bbb']);
      expect(component.pendingDelete()).toBeNull();
      // "Days trained" counts these, so the dashboard is stale until it reloads.
      expect(refresh).toHaveBeenCalled();
    });

    it('keeps the row when the delete fails', () => {
      component.confirmDeleteTraining(training('aaa', '2026-08-01'));

      httpMock
        .expectOne(`${environment.apiUrl}/trainings/aaa`)
        .flush({ success: false }, { status: 500, statusText: 'Server Error' });

      expect(component.trainings().length).toBe(2);
      expect(component.pendingDelete()).toBeNull();
    });
  });

  describe('deleting a weigh-in', () => {
    it('removes the entry and refreshes', () => {
      const refresh = spyOn(userService, 'triggerRefresh');
      component.weights.set([
        { _id: { $oid: 'w1' }, date: '2026-08-01', weight: 77 },
        { _id: { $oid: 'w2' }, date: '2026-08-02', weight: 76.5 },
      ]);

      component.confirmDeleteWeight({ _id: { $oid: 'w1' }, date: '2026-08-01', weight: 77 });

      httpMock.expectOne(`${environment.apiUrl}/weight_updates/w1`).flush({ success: true });

      expect(component.weights().map((w) => w._id?.$oid)).toEqual(['w2']);
      expect(refresh).toHaveBeenCalled();
    });

    /** The history endpoint only started returning `_id` when deletion was added. */
    it('does nothing for an entry with no id', () => {
      component.weights.set([{ date: '2026-08-01', weight: 77 }]);

      component.confirmDeleteWeight({ date: '2026-08-01', weight: 77 });

      httpMock.expectNone((request) => request.method === 'DELETE');
      expect(component.weights().length).toBe(1);
    });
  });
});

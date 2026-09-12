id} className="flex items-center justify-between py-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-5">{idx + 1}</span>
                  <span className="dark:text-gray-200">{(entry as any).patients?.full_name}</span>
                </div>
                <QueueEntryRow
                  entryId={entry.id}
                  role={profile.role}
                  status="waiting"
                  canStart={!inProgressEntry}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    {/* عمود شمال: إضافة للطابور + مواعيد النهاردة + اللي خلصوا */}
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">إضافة عيان للطابور</h2>
        <WalkInForm patients={patients ?? []} />
      </div>

      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">مواعيد النهاردة</h2>
        {pendingAppointments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">مفيش مواعيد لسه محتاجة تتضاف</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingAppointments.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between py-2 gap-2">
                <div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    {new Date(a.appointment_date).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="dark:text-gray-200">{a.patients?.full_name}</span>
                </div>
                <AddToQueueButton patientId={a.patients?.id} appointmentId={a.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">خلصوا النهاردة ({(doneEntries ?? []).length})</h2>
        {(doneEntries ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">لسه محدش خلص</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {(doneEntries ?? []).map((entry: any) => (
              <li key={entry.id} className="flex items-center justify-between py-2 gap-2">
                <span className="dark:text-gray-200">{entry.patients?.full_name}</span>
                <Link
                  href={`/invoices/new?patient_id=${entry.patient_id}`}
                  className="text-brand-600 dark:text-brand-400 text-xs hover:underline shrink-0"
                >
                  تسجيل الفاتورة 🧾
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
</div>
); }
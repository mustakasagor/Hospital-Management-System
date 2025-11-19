// hms.cpp
// Simple OOP Hospital logic for WASM
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <mutex>

using std::string;
using std::vector;
using std::to_string;
using std::ostringstream;

static std::mutex global_mutex;

struct Person {
    int id;
    string name;
    int age;
    string gender;
};

struct Patient : Person {
    string address;
    string phone;
};

struct Doctor : Person {
    string specialization;
};

struct Appointment {
    int id;
    int patient_id;
    int doctor_id;
    string datetime;
    string reason;
    string status; // "scheduled", "done", "cancelled"
};

class Hospital {
private:
    vector<Patient> patients;
    vector<Doctor> doctors;
    vector<Appointment> appointments;
    int nextPatient = 1;
    int nextDoctor = 1;
    int nextAppointment = 1;

    Patient* findPatient(int id) {
        for (auto &p : patients) if (p.id == id) return &p;
        return nullptr;
    }
    Doctor* findDoctor(int id) {
        for (auto &d : doctors) if (d.id == id) return &d;
        return nullptr;
    }
    Appointment* findAppointment(int id) {
        for (auto &a : appointments) if (a.id == id) return &a;
        return nullptr;
    }

public:
    // Patients
    int addPatient(const string& name, int age, const string& gender,
                   const string& address, const string& phone) {
        std::lock_guard<std::mutex> lk(global_mutex);
        Patient p;
        p.id = nextPatient++;
        p.name = name; p.age = age; p.gender = gender;
        p.address = address; p.phone = phone;
        patients.push_back(p);
        return p.id;
    }

    bool updatePatient(int id, const string& name, int age, const string& gender,
                       const string& address, const string& phone) {
        std::lock_guard<std::mutex> lk(global_mutex);
        Patient* p = findPatient(id);
        if (!p) return false;
        p->name = name; p->age = age; p->gender = gender;
        p->address = address; p->phone = phone;
        return true;
    }

    bool deletePatient(int id) {
        std::lock_guard<std::mutex> lk(global_mutex);
        auto it = std::remove_if(patients.begin(), patients.end(),
                                 [id](const Patient& p){ return p.id == id; });
        if (it == patients.end()) return false;
        patients.erase(it, patients.end());
        appointments.erase(std::remove_if(appointments.begin(), appointments.end(),
                                          [id](const Appointment& a){ return a.patient_id == id; }),
                           appointments.end());
        return true;
    }

    string listPatients() {
        std::lock_guard<std::mutex> lk(global_mutex);
        ostringstream out;
        for (auto &p : patients) {
            out << p.id << "|" << p.name << "|" << p.age << "|" << p.gender
                << "|" << p.address << "|" << p.phone << "\n";
        }
        return out.str();
    }

    string searchPatients(const string& term) {
        std::lock_guard<std::mutex> lk(global_mutex);
        string t = term;
        std::transform(t.begin(), t.end(), t.begin(), ::tolower);
        ostringstream out;
        for (auto &p : patients) {
            string lower = p.name;
            std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
            if (lower.find(t) != string::npos || to_string(p.id) == term) {
                out << p.id << "|" << p.name << "|" << p.age << "|" << p.gender
                    << "|" << p.address << "|" << p.phone << "\n";
            }
        }
        return out.str();
    }

    // Doctors
    int addDoctor(const string& name, int age, const string& gender, const string& specialization) {
        std::lock_guard<std::mutex> lk(global_mutex);
        Doctor d;
        d.id = nextDoctor++;
        d.name = name; d.age = age; d.gender = gender;
        d.specialization = specialization;
        doctors.push_back(d);
        return d.id;
    }

    bool deleteDoctor(int id) {
        std::lock_guard<std::mutex> lk(global_mutex);
        auto it = std::remove_if(doctors.begin(), doctors.end(),
                                 [id](const Doctor& d){ return d.id == id; });
        if (it == doctors.end()) return false;
        doctors.erase(it, doctors.end());
        for (auto &a : appointments) {
            if (a.doctor_id == id) a.status = "cancelled";
        }
        return true;
    }

    string listDoctors() {
        std::lock_guard<std::mutex> lk(global_mutex);
        ostringstream out;
        for (auto &d : doctors) {
            out << d.id << "|" << d.name << "|" << d.age << "|" << d.gender
                << "|" << d.specialization << "\n";
        }
        return out.str();
    }

    string searchDoctors(const string& term) {
        std::lock_guard<std::mutex> lk(global_mutex);
        string t = term;
        std::transform(t.begin(), t.end(), t.begin(), ::tolower);
        ostringstream out;
        for (auto &d : doctors) {
            string lname = d.name;
            std::transform(lname.begin(), lname.end(), lname.begin(), ::tolower);
            string spec = d.specialization;
            std::transform(spec.begin(), spec.end(), spec.begin(), ::tolower);
            if (lname.find(t) != string::npos || spec.find(t) != string::npos || to_string(d.id) == term) {
                out << d.id << "|" << d.name << "|" << d.age << "|" << d.gender
                    << "|" << d.specialization << "\n";
            }
        }
        return out.str();
    }

    // Appointments
    int createAppointment(int patient_id, int doctor_id, const string& datetime, const string& reason) {
        std::lock_guard<std::mutex> lk(global_mutex);
        if (!findPatient(patient_id) || !findDoctor(doctor_id)) return -1;
        Appointment a;
        a.id = nextAppointment++;
        a.patient_id = patient_id;
        a.doctor_id = doctor_id;
        a.datetime = datetime;
        a.reason = reason;
        a.status = "scheduled";
        appointments.push_back(a);
        return a.id;
    }

    bool cancelAppointment(int id) {
        std::lock_guard<std::mutex> lk(global_mutex);
        Appointment* a = findAppointment(id);
        if (!a) return false;
        a->status = "cancelled";
        return true;
    }

    bool markAppointmentDone(int id) {
        std::lock_guard<std::mutex> lk(global_mutex);
        Appointment* a = findAppointment(id);
        if (!a) return false;
        a->status = "done";
        return true;
    }

    string listAppointments() {
        std::lock_guard<std::mutex> lk(global_mutex);
        ostringstream out;
        for (auto &a : appointments) {
            out << a.id << "|" << a.patient_id << "|" << a.doctor_id << "|" << a.datetime
                << "|" << a.reason << "|" << a.status << "\n";
        }
        return out.str();
    }

    string getStats() {
        std::lock_guard<std::mutex> lk(global_mutex);
        int p = (int)patients.size();
        int d = (int)doctors.size();
        int ap = (int)appointments.size();
        int scheduled=0, done=0, cancelled=0;
        for (auto &a : appointments) {
            if (a.status == "scheduled") scheduled++;
            else if (a.status == "done") done++;
            else if (a.status == "cancelled") cancelled++;
        }
        ostringstream out;
        out << "{";
        out << "\"patients\":" << p << ",";
        out << "\"doctors\":" << d << ",";
        out << "\"appointments\":" << ap << ",";
        out << "\"scheduled\":" << scheduled << ",";
        out << "\"done\":" << done << ",";
        out << "\"cancelled\":" << cancelled;
        out << "}";
        return out.str();
    }
};

static Hospital hospital;
static string last_return;

extern "C" {

// Patients
int add_patient(const char* name, int age, const char* gender, const char* address, const char* phone) {
    return hospital.addPatient(string(name?name:""), age, string(gender?gender:""), string(address?address:""), string(phone?phone:""));
}
int update_patient(int id, const char* name, int age, const char* gender, const char* address, const char* phone) {
    return hospital.updatePatient(id, string(name?name:""), age, string(gender?gender:""), string(address?address:""), string(phone?phone:"")) ? 1 : 0;
}
int delete_patient(int id) {
    return hospital.deletePatient(id) ? 1 : 0;
}
const char* get_patients() {
    last_return = hospital.listPatients();
    return last_return.c_str();
}
const char* search_patients(const char* term) {
    last_return = hospital.searchPatients(string(term?term:""));
    return last_return.c_str();
}

// Doctors
int add_doctor(const char* name, int age, const char* gender, const char* specialization) {
    return hospital.addDoctor(string(name?name:""), age, string(gender?gender:""), string(specialization?specialization:""));
}
int delete_doctor(int id) {
    return hospital.deleteDoctor(id) ? 1 : 0;
}
const char* get_doctors() {
    last_return = hospital.listDoctors();
    return last_return.c_str();
}
const char* search_doctors(const char* term) {
    last_return = hospital.searchDoctors(string(term?term:""));
    return last_return.c_str();
}

// Appointments
int create_appointment(int patient_id, int doctor_id, const char* datetime, const char* reason) {
    return hospital.createAppointment(patient_id, doctor_id, string(datetime?datetime:""), string(reason?reason:""));
}
int cancel_appointment(int id) {
    return hospital.cancelAppointment(id) ? 1 : 0;
}
int mark_appointment_done(int id) {
    return hospital.markAppointmentDone(id) ? 1 : 0;
}
const char* get_appointments() {
    last_return = hospital.listAppointments();
    return last_return.c_str();
}

// Stats
const char* get_stats() {
    last_return = hospital.getStats();
    return last_return.c_str();
}

} // extern "C"